import { MIN_SIMILARITY } from '../../../constants'
import { EnrichedFaceMatcherResult } from '../../../types'
import { extractMessageId } from '../../../utils/extract.utils'
import { FaceDescriptorService } from '../../face-detection/face-descriptor.service'
import { FaceMatchesService } from '../../face-detection/face-matches.service'
import { LoggerService } from '../../logs/logger.service'
import { TelegramScraperService } from '../../scraping/telegram-scrapper.service'

export class TelegramFaceSearchService {
  private faceDescriptor = new FaceDescriptorService()
  private faceMatches = new FaceMatchesService()
  private telegramScraper = new TelegramScraperService()
  private loggerService = new LoggerService()

  async searchByImage(
    imagePath: string,
    queryId: string,
    minYear?: number,
    minSimilarity: number = MIN_SIMILARITY,
  ): Promise<{ results: EnrichedFaceMatcherResult; totalMatches: number }> {
    // Validate and get descriptor
    const inputDescriptor = await this.validateAndGetDescriptor(imagePath)

    // Find matches across channels
    const rawResults = await this.faceMatches.findDescriptorMatchesAcrossAllChannels(
      inputDescriptor,
      minSimilarity,
      queryId,
      minYear,
    )

    // Enrich with Telegram data
    const enrichedResults = await this.enrichResults(rawResults)

    return {
      results: enrichedResults,
      totalMatches: this.countTotalMatches(enrichedResults),
    }
  }

  private async validateAndGetDescriptor(imagePath: string): Promise<Float32Array> {
    if (!imagePath) {
      throw new Error('Image path is required')
    }

    const descriptor = await this.faceDescriptor.getFaceDescriptor(imagePath)
    if (!descriptor) {
      throw new Error('No face detected in uploaded image')
    }

    return descriptor
  }

  private async enrichResults(results: EnrichedFaceMatcherResult) {
    return await this.telegramScraper.enrichFaceMatchesWithTelegramMessages(results, this.telegramScraper)
  }

  async logResults(imagePath: string, results: EnrichedFaceMatcherResult, queryId: string) {
    await this.loggerService.saveSearchResultsLog(queryId, results, (r) => extractMessageId(r.sourceImageUrl))
    await this.loggerService.logGlobalSearchSession('image', imagePath, results, (m) =>
      extractMessageId(m.sourceImageUrl),
    )
  }

  private countTotalMatches(results: EnrichedFaceMatcherResult): number {
    return Object.values(results).flat().length
  }

  // For development only
  async temporaryMarkAsReviewed(queryId: string, results: EnrichedFaceMatcherResult) {
    for (const [channel, matches] of Object.entries(results)) {
      const ids = matches.map((m) => extractMessageId(m.sourceImageUrl)).filter((id): id is number => id !== null)
      await this.loggerService.markMessagesAsReviewed(queryId, channel, ids)
    }
  }
}
