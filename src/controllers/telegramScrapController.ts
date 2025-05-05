import { Request, Response, NextFunction } from 'express'
import { fetchTelegramMessages } from '../utils/telegramScraper'

//TODO: Complete telegram scraper

export const startSearchingTGChannel = async (req: Request, res: Response, next: NextFunction) => {
  const { channel } = req.body

  if (!channel) {
    return res.status(400).json({ error: 'Channel name is required' })
  }

  try {
    const messages = await fetchTelegramMessages(channel as string)
    res.json({ messages })
  } catch (error) {
    next(error)
  }
}
