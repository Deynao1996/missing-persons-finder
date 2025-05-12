import {
  BATCH_SIZE,
  MAX_IMAGES,
  MIN_SIMILARITY,
  SEARCH_TELEGRAM_FROM,
  SEARCHED_TELEGRAM_CHANNEL,
  SEARCHING_WEBSITES,
} from '../../../constants'
import { delay } from '../../../utils/delay.util'
import { FaceDescriptorService } from '../../face-detection/face-descriptor.service'
import { FaceMatchesService } from '../../face-detection/face-matches.service'
import { NameVariantService } from '../../name-matching/name-variants.service'
import { TelegramScraperService } from '../../scraping/telegram-scrapper.service'
import { TextMatchResult } from '../../scraping/types'
import { UnityScraperService } from '../../scraping/unity-scraper.service'

export class CombineSearchHelper {
  private nameVariantService = new NameVariantService()
  private telegramService = new TelegramScraperService()
  private scraperService = new UnityScraperService()
  private faceDescriptorService = new FaceDescriptorService()
  private faceMatchesService = new FaceMatchesService()

  async handleTextSearch(query: string, maxResults: number): Promise<TextMatchResult[]> {
    const results: TextMatchResult[] = []
    const { firstName, lastName } = this.nameVariantService.parseNameQuery(query)

    const telegramResults = await this.telegramService.searchMessagesInChannel(
      SEARCHED_TELEGRAM_CHANNEL,
      { firstName, lastName },
      new Date(SEARCH_TELEGRAM_FROM),
      maxResults,
    )

    const websiteResults = await this.scraperService.bulkTextSearchAcrossWebsites({
      name: { firstName, lastName },
      websites: SEARCHING_WEBSITES,
      options: { maxConcurrent: 3, proxyRotate: true },
    })

    results.push(...telegramResults, ...websiteResults)
    return results
  }

  async handleImageSearch(imagePath: string): Promise<any[]> {
    const matches: any[] = []

    const inputDescriptor = await this.faceDescriptorService.getFaceDescriptor(imagePath)
    if (!inputDescriptor) throw new Error('No face detected in uploaded image')

    const websiteMatches = await this.scraperService.performImageSearch(imagePath)
    const telegramMatches = await this.searchTelegramFaces(inputDescriptor)

    matches.push(...telegramMatches, ...websiteMatches)
    return matches
  }

  async searchTelegramFaces(inputDescriptor: Float32Array): Promise<any[]> {
    const allMatches: any[] = []
    let offsetId = 0
    let fetched = 0

    while (fetched < MAX_IMAGES) {
      const images = await this.telegramService.fetchImageBatchFromTelegramChannel({
        channelUsername: SEARCHED_TELEGRAM_CHANNEL,
        batchSize: BATCH_SIZE,
        minDate: new Date(SEARCH_TELEGRAM_FROM),
        offsetId,
      })

      if (images.length === 0) break

      offsetId = parseInt(images[images.length - 1].meta)
      const matches = await this.faceMatchesService.findFaceMatches(inputDescriptor, images, MIN_SIMILARITY)
      allMatches.push(...matches)
      fetched += images.length

      await delay(1000)
    }

    return allMatches
  }
}
