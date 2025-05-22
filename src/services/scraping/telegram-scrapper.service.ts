import { FaceMatcherResult, PartialSearchedName, TextMatchResult } from '../types'
import { TelegramClientService } from '../client/telegram-client.service'
import { Api } from 'telegram'
import { FaceDescriptorService } from '../face-detection/face-descriptor.service'
import { delay } from '../../utils/delay.util'
import { NameVariantService } from '../name-matching/name-variants.service'
import { ImageProcessorService } from '../image-processor/image-processor.service'
import { BatchedImage } from '../types'
import { parseTelegramLink } from '../../utils/extract.utils'
import fs from 'fs/promises'
import path from 'path'
import { TELEGRAM_CACHE_DIR } from '../../constants'

export class TelegramScraperService extends TelegramClientService {
  private faceDescriptorService = new FaceDescriptorService()
  private imageProcessorService = new ImageProcessorService()
  private nameVariantService = new NameVariantService()
  constructor() {
    super()
  }

  async searchMessagesInChannel(
    channelUsername: string,
    { firstName, lastName, patronymic }: PartialSearchedName,
    date: string = '2022-04-21',
    delayMs: number = 1000,
  ): Promise<TextMatchResult[]> {
    await this.connect()
    const channel = await this.client.getEntity(channelUsername)
    const messages: TextMatchResult[] = []
    const seenMessageIds = new Set<number>()
    const minDate = new Date(date)

    const nameVariants = this.nameVariantService.generateUkrainianNameVariants(firstName, lastName, patronymic)

    // ✅ Load reviewedMessages from search_results.json
    const reviewedMessageIds = new Set<number>()
    const logPath = path.join(TELEGRAM_CACHE_DIR, channelUsername, 'search_results.json')

    try {
      const logData = await fs.readFile(logPath, 'utf-8')
      const log = JSON.parse(logData)
      if (Array.isArray(log.reviewedMessages)) {
        for (const id of log.reviewedMessages) {
          reviewedMessageIds.add(id)
        }
      }
    } catch (e) {
      // file may not exist yet — okay
    }

    for (const variant of nameVariants) {
      let offsetId = 0
      let offsetDate = Math.floor(Date.now() / 1000)
      let keepFetching = true

      while (keepFetching) {
        const result = await this.client.getMessages(channel, {
          limit: 100,
          search: variant,
          offsetDate,
          offsetId,
        })

        if (!result || result.length === 0) {
          console.log(`✅ Finished for variant: "${variant}"`)
          break
        }

        for (const msg of result) {
          const msgDate = new Date(msg.date * 1000)
          if (msgDate < minDate) {
            console.log(`🛑 Reached minDate (${minDate.toISOString()}) for variant: "${variant}"`)
            keepFetching = false
            break
          }

          if (
            msg.message &&
            !seenMessageIds.has(msg.id) &&
            !reviewedMessageIds.has(msg.id) // ✅ Skip already reviewed
          ) {
            messages.push({
              text: msg.message,
              date: msgDate.toLocaleString('uk-UA'),
              link: `https://t.me/${channelUsername}/${msg.id}`,
            })
            seenMessageIds.add(msg.id)
          }
        }

        const lastMsg = result[result.length - 1]
        if (!lastMsg || lastMsg.id === offsetId) {
          console.log(`⛔ No progress in offsetId, stopping for: "${variant}"`)
          break
        }

        offsetId = lastMsg.id
        offsetDate = lastMsg.date

        if (delayMs) await delay(delayMs)
      }
    }

    return messages
  }

  async *fetchAllImagesSinceDate({
    channelUsername,
    minDate,
    delayMs = 500,
    startFromId = 0,
    seenIds = new Set<number>(),
    newlySkipped = new Set<number>(),
  }: {
    channelUsername: string
    minDate: Date
    delayMs?: number
    startFromId?: number
    seenIds?: Set<number>
    newlySkipped?: Set<number>
  }): AsyncGenerator<BatchedImage[], void, unknown> {
    const channel = await this.client.getEntity(channelUsername)
    let offsetId = startFromId
    let keepFetching = true

    while (keepFetching) {
      const messages: Api.Message[] = await this.client.getMessages(channel, { limit: 50, offsetId })
      if (!messages?.length) break

      const batch: BatchedImage[] = []

      for (const msg of messages) {
        offsetId = msg.id
        const msgDate = new Date(msg.date * 1000)

        if (msgDate < minDate) {
          keepFetching = false
          break
        }

        if (seenIds.has(msg.id)) continue

        const imageBatch = await this.processMessageToBatchedImages(msg, channelUsername, msgDate, newlySkipped)
        if (imageBatch) batch.push(...imageBatch)
      }

      if (batch.length > 0) yield batch
      if (delayMs) await delay(delayMs)
    }
  }

  async *fetchNewImagesAfterIdGenerator({
    channelUsername,
    lastSeenMsgId,
    seenIds,
    newlySkipped,
    delayMs = 500,
  }: {
    channelUsername: string
    lastSeenMsgId: number
    seenIds: Set<number>
    newlySkipped: Set<number>
    delayMs?: number
  }): AsyncGenerator<BatchedImage[], void, unknown> {
    const channel = await this.client.getEntity(channelUsername)
    let offsetId = 0
    let keepFetching = true

    while (keepFetching) {
      const messages: Api.Message[] = await this.client.getMessages(channel, { limit: 50, offsetId })
      if (!messages?.length) break

      const batch: BatchedImage[] = []

      for (const msg of messages) {
        offsetId = msg.id
        const msgDate = new Date(msg.date * 1000)

        if (msg.id <= lastSeenMsgId || seenIds.has(msg.id)) {
          keepFetching = false
          break
        }

        const imageBatch = await this.processMessageToBatchedImages(msg, channelUsername, msgDate, newlySkipped)
        if (imageBatch) batch.push(...imageBatch)
      }

      if (batch.length > 0) yield batch
      if (delayMs) await delay(delayMs)
    }
  }

  async enrichFaceMatchesWithTelegramMessages(
    results: Record<string, FaceMatcherResult[]>,
    scraper: TelegramScraperService,
  ): Promise<Record<string, FaceMatcherResult[]>> {
    const enrichedResults: Record<string, FaceMatcherResult[]> = {}

    for (const [channel, matches] of Object.entries(results)) {
      enrichedResults[channel] = []

      // Extract unique message IDs
      const messageIdToMatchMap: Record<number, FaceMatcherResult[]> = {}
      const messageIds: number[] = []

      for (const match of matches) {
        const parsed = parseTelegramLink(match.sourceImageUrl)
        if (parsed && parsed.channel === channel) {
          const messageId = parsed.messageId
          if (!messageIdToMatchMap[messageId]) {
            messageIds.push(messageId)
            messageIdToMatchMap[messageId] = []
          }
          messageIdToMatchMap[messageId].push(match)
        } else {
          enrichedResults[channel].push({ ...match, textMessage: undefined })
        }
      }

      // Batch fetch messages
      const messages = await scraper.getMessagesFromChannel(channel, messageIds)

      for (const message of messages) {
        const matchesForMessage = messageIdToMatchMap[message.id] || []
        for (const match of matchesForMessage) {
          enrichedResults[channel].push({
            ...match,
            textMessage: message.message || undefined,
          })
        }
      }
    }

    return enrichedResults
  }

  private async getMessagesFromChannel(channelUsername: string, messageIds: number[]) {
    await this.connect()
    const channel = await this.client.getEntity(channelUsername)
    return this.client.getMessages(channel, { ids: messageIds })
  }

  private async processMessageToBatchedImages(
    msg: Api.Message,
    channelUsername: string,
    msgDate: Date,
    newlySkipped: Set<number>,
  ): Promise<BatchedImage[] | null> {
    try {
      const buffer = await this.extractImageBufferFromMessage(msg)
      if (!buffer) {
        newlySkipped.add(msg.id)
        return null
      }

      const processed = await this.imageProcessorService.processImageBuffer(buffer)
      const descriptors = await this.faceDescriptorService.getMultipleFaceDescriptors(processed)

      if (!descriptors?.length) {
        newlySkipped.add(msg.id)
        return null
      }

      return descriptors.map((descriptor, i) => ({
        imageBuffer: processed,
        descriptor: Array.from(descriptor),
        meta: {
          msgId: msg.id,
          faceIndex: i,
          msgDate,
          sourceImageUrl: `https://t.me/${channelUsername}/${msg.id}`,
        },
      }))
    } catch (err) {
      console.warn(`❌ Error processing msg ${msg.id}:`, err)
      newlySkipped.add(msg.id)
      return null
    }
  }

  private async extractImageBufferFromMessage(msg: Api.Message): Promise<Buffer | null> {
    try {
      if (msg.media instanceof Api.MessageMediaPhoto) {
        const mediaData = await this.client.downloadMedia(msg.media)
        return mediaData ? (Buffer.isBuffer(mediaData) ? mediaData : Buffer.from(mediaData, 'base64')) : null
      }

      if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
        const doc = msg.media.document
        const isVideo = doc.mimeType?.startsWith('video/') ?? false

        if (isVideo && Array.isArray(doc.thumbs)) {
          const thumb = doc.thumbs
            .filter((t): t is Api.PhotoSize => t instanceof Api.PhotoSize)
            .sort((a, b) => b.w * b.h - a.w * a.h)[0]

          if (thumb) {
            const fileLocation = new Api.InputDocumentFileLocation({
              id: doc.id,
              accessHash: doc.accessHash,
              fileReference: doc.fileReference,
              thumbSize: thumb.type,
            })

            const thumbData = await this.client.downloadFile(fileLocation, {})
            return thumbData ? (Buffer.isBuffer(thumbData) ? thumbData : Buffer.from(thumbData, 'binary')) : null
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ Failed to extract media from msg ${msg.id}:`, err)
    }

    return null
  }
}
