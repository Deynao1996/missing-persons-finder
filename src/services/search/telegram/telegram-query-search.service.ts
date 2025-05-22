import { SKIPPED_CHANNELS } from '../../../constants'
import { extractAvailableTelegramChannels, extractMessageId, parseSearchQuery } from '../../../utils/extract.utils'
import { LoggerService } from '../../logs/logger.service'
import { NameVariantService } from '../../name-matching/name-variants.service'
import { TelegramScraperService } from '../../scraping/telegram-scrapper.service'
import { PartialSearchedName, TextMatchResult } from '../../scraping/types'

export class TelegramQuerySearchService {
  private nameVariantService = new NameVariantService()
  private loggerService = new LoggerService()
  private telegramScrapper = new TelegramScraperService()

  async performTextSearch(query: string): Promise<Record<string, TextMatchResult[]>> {
    const rawQueries = parseSearchQuery(query)
    const parsedNames = rawQueries.map(this.nameVariantService.parseNameQuery)
    const channels = await extractAvailableTelegramChannels(SKIPPED_CHANNELS)
    const allResults: Record<string, TextMatchResult[]> = {}

    await Promise.all(
      channels.map(async (channelName) => {
        try {
          const channelResults = await this.searchChannel(parsedNames, channelName)
          if (channelResults.length > 0) {
            allResults[channelName] = channelResults
          }
        } catch (error) {
          console.warn(`⚠️ Skipping ${channelName} due to error:`, error)
        }
      }),
    )

    return allResults
  }

  private deduplicateResults(results: TextMatchResult[]): TextMatchResult[] {
    const values = new Map(results.map((msg) => [msg.link, msg])).values()
    return Array.from(values)
  }

  async searchChannel(nameVariants: PartialSearchedName[], channelName: string): Promise<TextMatchResult[]> {
    const channelResults: TextMatchResult[] = []

    for (const { firstName, lastName, patronymic } of nameVariants) {
      const results = await this.telegramScrapper.searchMessagesInChannel(channelName, {
        firstName,
        lastName,
        patronymic,
      })
      channelResults.push(...results)
    }

    return this.deduplicateResults(channelResults)
  }

  async logSearchSession(query: string, results: Record<string, TextMatchResult[]>): Promise<void> {
    await Promise.all([
      this.loggerService.saveTextSearchResultsLog(results),
      this.loggerService.logTextSearchSession(query, results),
    ])
  }

  async temporarilyMarkAsReviewed(results: Record<string, TextMatchResult[]>): Promise<void> {
    await Promise.all(
      Object.entries(results).map(async ([channel, results]) => {
        const ids = results.map((r) => extractMessageId(r.link)).filter((id): id is number => id !== null)
        return this.loggerService.markMessagesAsReviewed(channel, ids)
      }),
    )
  }
}
