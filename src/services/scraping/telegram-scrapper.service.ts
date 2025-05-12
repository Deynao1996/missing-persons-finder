import { PartialSearchedName, TextMatchResult } from './types'
import { TelegramClientService } from '../client/telegram-client.service'
import path from 'path'
import fs from 'fs'
import { Api } from 'telegram'
import { FaceDescriptorService } from '../face-detection/face-descriptor.service'
import { TelegramImageProcessorService } from '../image-processor/telegram-processor.service'
import { TEMP_DIR } from '../../constants'
import { delay } from '../../utils/delay.util'
import { NameVariantService } from '../name-matching/name-variants.service'

export class TelegramScraperService extends TelegramClientService {
  private faceDescriptorService = new FaceDescriptorService()
  private telegramImageProcessorService = new TelegramImageProcessorService()
  private nameVariantService = new NameVariantService()
  constructor() {
    super()
  }

  async searchMessagesInChannel(
    channelUsername: string,
    { firstName, lastName }: PartialSearchedName,
    minDate?: Date,
    maxMessages: number = 500,
    delayMs: number = 500,
  ): Promise<TextMatchResult[]> {
    await this.connect()
    const channel = await this.client.getEntity(channelUsername)
    const messages: TextMatchResult[] = []
    const seenMessageIds = new Set<number>()

    // Parse the query and generate name variants
    const nameVariants = this.nameVariantService.generateUkrainianNameVariants(firstName, lastName)

    let totalFetched = 0

    for (const variant of nameVariants) {
      let offsetId = 0
      let fetched = 0
      let keepFetching = true

      while (keepFetching && totalFetched < maxMessages) {
        const result = await this.client.getMessages(channel, {
          limit: 100,
          search: variant,
          offsetId,
        })

        if (!result || result.length === 0) break

        for (const msg of result) {
          const msgDate = new Date(msg.date * 1000)
          if (minDate && msgDate < minDate) {
            keepFetching = false
            break
          }

          if (msg.message && !seenMessageIds.has(msg.id)) {
            messages.push({
              text: msg.message,
              date: msgDate.toLocaleString('uk-UA'),
              link: `https://t.me/${channelUsername}/${msg.id}`,
            })
            seenMessageIds.add(msg.id)
            fetched++
            totalFetched++
            if (totalFetched >= maxMessages) {
              keepFetching = false
              break
            }
          }
        }

        const lastId = result[result.length - 1]?.id
        if (!lastId || lastId === offsetId) break
        offsetId = lastId

        if (delayMs) await delay(delayMs)
      }

      if (totalFetched >= maxMessages) break
    }

    return messages
  }

  async fetchImageBatchFromTelegramChannel({
    channelUsername,
    batchSize = 20,
    outputDir = TEMP_DIR,
    minDate,
    offsetId = 0,
  }: {
    channelUsername: string
    batchSize?: number
    outputDir?: string
    minDate?: Date
    offsetId?: number
  }): Promise<Array<{ filepath: string; meta: string; sourceImageUrl: string }>> {
    const rawDir = path.join(outputDir, 'raw_images', channelUsername)
    if (!fs.existsSync(rawDir)) {
      fs.mkdirSync(rawDir, { recursive: true })
    }
    const channel = await this.client.getEntity(channelUsername)
    const downloadedImages: Array<{
      filepath: string
      meta: string
      sourceImageUrl: string
    }> = []

    let fetched = 0
    let currentOffsetId = offsetId

    while (fetched < batchSize) {
      const result: Api.Message[] = await this.client.getMessages(channel, {
        limit: 50,
        offsetId: currentOffsetId,
      })

      if (!result || result.length === 0) break

      for (const msg of result) {
        currentOffsetId = msg.id

        const msgDate = new Date(msg.date * 1000)
        if (minDate && msgDate < minDate) return downloadedImages

        if (msg instanceof Api.Message && msg.media instanceof Api.MessageMediaPhoto) {
          try {
            const buffer = await this.client.downloadMedia(msg.media)
            if (!buffer) continue

            // Step 1: Save buffer as-is temporarily
            const rawFilename = `photo_${channelUsername}_${msg.id}`
            const tempFilePath = path.join(rawDir, `${rawFilename}.jpg`)
            fs.writeFileSync(tempFilePath, Buffer.from(buffer))

            // Step 2: Standardize image (resize & convert if needed)
            const { processedPath } = await this.telegramImageProcessorService.processTelegramImage(tempFilePath, {
              targetFormat: 'jpeg',
              width: 800,
              height: 800,
            })

            // Step 3: Run face detection
            const descriptor = await this.faceDescriptorService.getFaceDescriptor(processedPath)
            if (!descriptor) {
              fs.unlinkSync(processedPath)
              console.log(`🚫 No face found in ${processedPath}, skipping.`)
              continue
            }

            // Step 4: Save info
            downloadedImages.push({
              filepath: processedPath,
              meta: msg.id.toString(),
              sourceImageUrl: `https://t.me/${channelUsername}/${msg.id}`,
            })

            fetched++
            console.log('Fetched:', fetched)

            if (fetched >= batchSize) break
          } catch (err) {
            console.warn(`⚠️ Failed to process photo ${msg.id}:`, err)
          }
        }
      }
    }

    return downloadedImages
  }
}
