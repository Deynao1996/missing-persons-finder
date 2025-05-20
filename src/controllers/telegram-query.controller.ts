import { Request, Response, NextFunction } from 'express'
import { TelegramScraperService } from '../services/scraping/telegram-scrapper.service'
import { NameVariantService } from '../services/name-matching/name-variants.service'
import { extractAvailableTelegramChannels } from '../utils/extract.utils'
import { TextMatchResult } from '../services/scraping/types'

const telegramScrapper = new TelegramScraperService()
const nameVariantService = new NameVariantService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  const { query }: { query?: string } = req.body

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' })
  }

  const rawQueries = query
    .split('/')
    .map((q) => q.trim())
    .filter(Boolean)

  // Parse all queries to name objects
  const parsedNames = rawQueries.map((q) => nameVariantService.parseNameQuery(q))

  try {
    const channels = await extractAvailableTelegramChannels()

    const allResults: Record<string, TextMatchResult[]> = {}

    for (const channelName of channels) {
      try {
        const channelResults: TextMatchResult[] = []

        for (const { firstName, lastName, patronymic } of parsedNames) {
          const results = await telegramScrapper.searchMessagesInChannel(channelName, {
            firstName,
            lastName,
            patronymic,
          })
          channelResults.push(...results)
        }

        // Only include unique messages
        const deduplicated = Array.from(new Map(channelResults.map((msg) => [msg.link, msg])).values())

        if (deduplicated.length > 0) {
          allResults[channelName] = deduplicated
        }
      } catch (error) {
        console.warn(`⚠️ Skipping ${channelName} due to error:`, error)
      }
    }

    res.json({ results: allResults })
  } catch (error) {
    next(error)
  }
}
