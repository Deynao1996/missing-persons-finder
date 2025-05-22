import { Request, Response, NextFunction } from 'express'
import { TelegramQuerySearchService } from '../services/search/telegram/telegram-query-search.service'

const telegramQuerySearch = new TelegramQuerySearchService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body

    // Validate input
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    // Process search
    const searchResults = await telegramQuerySearch.performTextSearch(query)

    // Log results
    await telegramQuerySearch.logSearchSession(query, searchResults)

    // Temporary auto-review (remove for production)
    await telegramQuerySearch.temporarilyMarkAsReviewed(searchResults)

    return res.json({ results: searchResults })
  } catch (error) {
    next(error)
  }
}
