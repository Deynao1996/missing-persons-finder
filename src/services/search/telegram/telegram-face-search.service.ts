import { MIN_SIMILARITY } from '../../../constants'
import { extractMessageId } from '../../../utils/extract.utils'
import { FaceDescriptorService } from '../../face-detection/face-descriptor.service'
import { FaceMatchesService } from '../../face-detection/face-matches.service'
import { LoggerService } from '../../logs/logger.service'
import { TelegramScraperService } from '../../scraping/telegram-scrapper.service'
import { FaceMatcherResult } from '../../scraping/types'

//TODO: Check refactoring types folder structure for a project

export class TelegramFaceSearchService {
  private faceDescriptor = new FaceDescriptorService()
  private faceMatches = new FaceMatchesService()
  private telegramScraper = new TelegramScraperService()
  private loggerService = new LoggerService()

  async searchByImage(
    imagePath: string,
    minYear?: number,
    minSimilarity: number = MIN_SIMILARITY,
  ): Promise<{ results: Record<string, FaceMatcherResult[]>; totalMatches: number }> {
    // Validate and get descriptor
    const inputDescriptor = await this.validateAndGetDescriptor(imagePath)

    // Find matches across channels
    const rawResults = await this.faceMatches.findDescriptorMatchesAcrossAllChannels(
      inputDescriptor,
      minSimilarity,
      minYear,
    )

    // Enrich with Telegram data
    const enrichedResults = await this.enrichResults(rawResults)

    // Log results
    await this.logResults(imagePath, enrichedResults)

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

  private async enrichResults(results: Record<string, FaceMatcherResult[]>) {
    return await this.telegramScraper.enrichFaceMatchesWithTelegramMessages(results, this.telegramScraper)
  }

  private async logResults(imagePath: string, results: Record<string, FaceMatcherResult[]>) {
    await Promise.all([
      this.loggerService.saveSearchResultsLog(results),
      this.loggerService.logGlobalSearchSession(imagePath, results),
    ])
  }

  private countTotalMatches(results: Record<string, FaceMatcherResult[]>): number {
    return Object.values(results).flat().length
  }

  // For development only
  async temporaryMarkAsReviewed(results: Record<string, FaceMatcherResult[]>) {
    await Promise.all(
      Object.entries(results).map(async ([channel, matches]) => {
        const ids = matches.map((m) => extractMessageId(m.sourceImageUrl)).filter(Boolean) as number[]
        await this.loggerService.markMessagesAsReviewed(channel, ids)
      }),
    )
  }
}
