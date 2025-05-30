import { SKIPPED_CHANNELS } from '../../../constants'
import { extractAvailableTelegramChannels, extractMessageId, parseSearchQuery } from '../../../utils/extract.utils'
import { LoggerService } from '../../logs/logger.service'
import { NameVariantService } from '../../name-matching/name-variants.service'
import { TelegramScraperService } from '../../scraping/telegram-scrapper.service'
import { PartialSearchedName, TextMatchResult } from '../../../types'

export class TelegramQuerySearchService {
  private nameVariantService = new NameVariantService()
  private loggerService = new LoggerService()
  private telegramScrapper = new TelegramScraperService()

  async performTextSearch(query: string, queryId: string): Promise<Record<string, TextMatchResult[]>> {
    const rawQueries = parseSearchQuery(query)
    const parsedNames = rawQueries.map(this.nameVariantService.parseNameQuery)
    const channels = await extractAvailableTelegramChannels(SKIPPED_CHANNELS)
    const allResults: Record<string, TextMatchResult[]> = {}

    const log = await this.loggerService.loadChannelLog()

    for (const channelName of channels) {
      try {
        const reviewedIds = new Set(log.reviewedMessages[queryId]?.[channelName] || [])

        const channelResults = await this.searchChannel(parsedNames, channelName)

        // Filter out reviewed messages
        const filteredResults = channelResults.filter((result) => {
          const id = extractMessageId(result.link)
          return id !== null && !reviewedIds.has(id as number)
        })

        if (filteredResults.length > 0) {
          allResults[channelName] = filteredResults
          console.log(`✅ Found ${filteredResults.length} matches in ${channelName}`)
        }
      } catch (error) {
        console.warn(`⚠️ Skipping ${channelName} due to error:`, error)
      }
    }

    return allResults
  }

  private deduplicateResults(results: TextMatchResult[]): TextMatchResult[] {
    const values = new Map(results.map((msg) => [msg.link, msg])).values()
    return Array.from(values)
  }

  async searchChannel(nameVariants: PartialSearchedName[], channelName: string): Promise<TextMatchResult[]> {
    const channelResults: TextMatchResult[] = []

    for (const { firstName, lastName } of nameVariants) {
      const results = await this.telegramScrapper.searchMessagesInChannel(channelName, {
        firstName,
        lastName,
      })
      channelResults.push(...results)
    }

    return this.deduplicateResults(channelResults)
  }

  async logSearchSession(query: string, results: Record<string, TextMatchResult[]>, queryId: string): Promise<void> {
    await this.loggerService.saveSearchResultsLog(queryId, results, (r) => extractMessageId(r.link))
    await this.loggerService.logGlobalSearchSession('text', query, results, (m) => extractMessageId(m.link))
  }

  async temporarilyMarkAsReviewed(queryId: string, results: Record<string, TextMatchResult[]>): Promise<void> {
    for (const [channel, resultsArray] of Object.entries(results)) {
      const ids = resultsArray.map((r) => extractMessageId(r.link)).filter((id): id is number => id !== null)
      await this.loggerService.markMessagesAsReviewed(queryId, channel, ids)
    }
  }
}
