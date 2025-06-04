import { Request, Response, NextFunction } from 'express'
import { CachingChannelService } from '../services/cache/caching-channel.service'
import { extractAvailableTelegramChannels } from '../utils/extract.utils'
import { CachingWebService } from '../services/cache/caching-web.service'

const cachingChannelService = new CachingChannelService()
const cachingWebService = new CachingWebService()

export const initializeTelegramCache = async (req: Request, res: Response, next: NextFunction) => {
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

export const initializeWebCache = async (_: Request, res: Response, next: NextFunction) => {
  try {
    await cachingWebService.createFullCache()
    res.json({ message: 'Initial cache created' })
  } catch (error) {
    next(error)
  }
}

export const updateCache = async (_: Request, res: Response, next: NextFunction) => {
  try {
    const channels = await extractAvailableTelegramChannels(['fgjgdcbjug'])

    for (const channelName of channels) {
      try {
        await cachingChannelService.updateChannelCache(channelName)
      } catch (err) {
        console.warn(`⚠️ Failed to update cache for ${channelName}:`, err)
      }
    }

    //TODO: Remove from production without proxy/vpn
    await cachingWebService.updateCacheIfNew()

    res.json({ results: 'Cache updated' })
  } catch (error) {
    next(error)
  }
}
