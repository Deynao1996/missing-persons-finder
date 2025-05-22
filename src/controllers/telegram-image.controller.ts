import { Request, Response, NextFunction } from 'express'
import { TelegramFaceSearchService } from '../services/search/telegram/telegram-face-search.service'

const telegramFaceSearch = new TelegramFaceSearchService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imagePath, minYear } = req.body

    const { results, totalMatches } = await telegramFaceSearch.searchByImage(
      imagePath,
      minYear ? parseInt(minYear, 10) : undefined,
    )

    // TODO: Remove for production
    await telegramFaceSearch.temporaryMarkAsReviewed(results)

    res.json({ results, totalMatches })
  } catch (error) {
    next(error)
  }
}
