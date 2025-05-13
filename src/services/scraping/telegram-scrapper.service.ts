import { FetchedImageBatchOptions, PartialSearchedName, TextMatchResult } from './types'
import { TelegramClientService } from '../client/telegram-client.service'
import { Api } from 'telegram'
import { FaceDescriptorService } from '../face-detection/face-descriptor.service'
import { delay } from '../../utils/delay.util'
import { NameVariantService } from '../name-matching/name-variants.service'
import { ImageProcessorService } from '../image-processor/image-processor.service'
import { BatchedImage } from '../image-processor/types'

export class TelegramScraperService extends TelegramClientService {
  private faceDescriptorService = new FaceDescriptorService()
  private imageProcessorService = new ImageProcessorService()
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
    minDate,
    offsetId = 0,
  }: FetchedImageBatchOptions): Promise<Array<BatchedImage>> {
    const downloadedImages: Array<BatchedImage> = []

    const channel = await this.client.getEntity(channelUsername)
    let fetched = 0
    let currentOffsetId = offsetId

    while (fetched < batchSize) {
      const messages: Api.Message[] = await this.client.getMessages(channel, {
        limit: 50,
        offsetId: currentOffsetId,
      })

      if (!messages || messages.length === 0) break

      for (const msg of messages) {
        currentOffsetId = msg.id

        const msgDate = new Date(msg.date * 1000)
        if (minDate && msgDate < minDate) {
          return downloadedImages
        }

        if (msg instanceof Api.Message && msg.media instanceof Api.MessageMediaPhoto) {
          try {
            const media = await this.client.downloadMedia(msg.media)
            if (!media) continue

            const mediaBuffer: Buffer = typeof media === 'string' ? Buffer.from(media, 'base64') : Buffer.from(media)

            const processedBuffer = await this.imageProcessorService.processImageBuffer(mediaBuffer)
            const descriptor = await this.faceDescriptorService.getFaceDescriptor(processedBuffer)

            if (!descriptor) {
              console.log(`🚫 No face found in message ${msg.id}, skipping.`)
              continue
            }

            downloadedImages.push({
              imageBuffer: processedBuffer,
              meta: msg.id.toString(),
              sourceImageUrl: `https://t.me/${channelUsername}/${msg.id}`,
            })

            fetched++
            console.log(`✅ Processed image ${fetched}/${batchSize}`)

            if (fetched >= batchSize) break
          } catch (err) {
            console.warn(`⚠️ Failed to process image from message ${msg.id}:`, err)
          }
        }
      }
    }

    return downloadedImages
  }
}
