import { Request, Response, NextFunction } from 'express'
import { TelegramScraperService } from '../services/scraping/telegram-scrapper.service'
import { FaceDescriptorService } from '../services/face-detection/face-descriptor.service'
import { FaceMatchesService } from '../services/face-detection/face-matches.service'
import { TEMP_DIR } from '../constants'
import { deleteTempFolder } from '../utils/delete-temp.util'

const telegramService = new TelegramScraperService()
const faceDescriptorService = new FaceDescriptorService()
const faceMatchesService = new FaceMatchesService()

export const startSearchingByText = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await telegramService.start()
    const result = await telegramService.searchMessagesInChannel(
      'unityandstrengthkh',
      'Омельяненко Ірина Станіславівна',
      new Date('2024-01-01'),
    )

    res.json({ result })
  } catch (error) {
    next(error)
  }
}

export const startSearchingByImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imagePath } = req.body
    if (!imagePath) throw new Error('No image path provided')

    // 1. Process input image
    const inputDescriptor = await faceDescriptorService.getFaceDescriptor(imagePath)
    if (!inputDescriptor) throw new Error('No face detected in uploaded image')

    // 2. Fetch images
    await telegramService.start()
    const imagesForSearch = await telegramService.fetchImageBatchFromTelegramChannel({
      channelUsername: 'unityandstrengthkh',
      batchSize: 20,
      minDate: new Date('2025-03-01'),
    })

    const matches = await faceMatchesService.findFaceMatches(
      inputDescriptor,
      imagesForSearch,
      0.3, // Minimum similarity threshold
    )

    res.json({ matches })
  } catch (error) {
    next(error)
  } finally {
    await deleteTempFolder(TEMP_DIR)
  }
}
