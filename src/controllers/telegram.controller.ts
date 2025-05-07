import { Request, Response, NextFunction } from 'express'
import { TelegramScraperService } from '../services/scraping/telegram-scrapper.service'

const telegramScraperService = new TelegramScraperService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await telegramScraperService.searchTextOnTelegram(req.body)
    return null
  } catch (error) {
    next(error)
  }
}
