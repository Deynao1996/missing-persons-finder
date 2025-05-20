import { Request, Response, NextFunction } from 'express'
import { CachingChannelService } from '../services/cache/caching-channel.service'
import { extractAvailableTelegramChannels } from '../utils/extract.utils'

const cachingChannelService = new CachingChannelService()

export const initializeCache = async (req: Request, res: Response, next: NextFunction) => {
  const { channelName } = req.body

  if (!channelName) {
    return res.status(400).json({ error: 'Channel name is required' })
  }

  try {
    const results = await cachingChannelService.initializeChannelCache(channelName)
    res.json({ results })
  } catch (error) {
    next(error)
  }
}

export const updateCache = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const channels = await extractAvailableTelegramChannels()

    for (const channelName of channels) {
      try {
        await cachingChannelService.updateChannelCache(channelName)
      } catch (err) {
        console.warn(`⚠️ Failed to update cache for ${channelName}:`, err)
      }
    }

    res.json({ results: 'Cache updated' })
  } catch (error) {
    next(error)
  }
}
