import { Request, Response, NextFunction } from 'express'
import { FaceMatchesService } from '../services/face-detection/face-matches.service'
import { FaceDescriptorService } from '../services/face-detection/face-descriptor.service'
import { MIN_SIMILARITY } from '../constants'
import { TelegramScraperService } from '../services/scraping/telegram-scrapper.service'

const faceMatches = new FaceMatchesService()
const faceDescriptor = new FaceDescriptorService()
const telegramScraper = new TelegramScraperService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  const { imagePath, minYear } = req.body

  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' })
  }

  try {
    const inputDescriptor = await faceDescriptor.getFaceDescriptor(imagePath)
    if (!inputDescriptor) {
      return res.status(400).json({ error: 'No face detected in uploaded image' })
    }

    const results = await faceMatches.findDescriptorMatchesAcrossAllChannels(
      inputDescriptor,
      MIN_SIMILARITY,
      minYear ? parseInt(minYear, 10) : undefined,
    )

    const enriched = await telegramScraper.enrichFaceMatchesWithTelegramMessages(results, telegramScraper)

    res.json({
      results: enriched,
      totalMatches: results.length,
    })
  } catch (error) {
    next(error)
  }
}
