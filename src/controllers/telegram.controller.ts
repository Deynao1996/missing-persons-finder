import { Request, Response, NextFunction } from 'express'
import { TelegramScraperService } from '../services/scraping/telegram-scrapper.service'
import { FaceDescriptorService } from '../services/face-detection/face-descriptor.service'
import { FaceMatchesService } from '../services/face-detection/face-matches.service'
import { MIN_SIMILARITY, TEMP_DIR } from '../constants'
import { deleteTempFolder } from '../utils/delete-temp.util'
import { delay } from '../utils/delay.util'

const telegramService = new TelegramScraperService()
const faceDescriptorService = new FaceDescriptorService()
const faceMatchesService = new FaceMatchesService()

export const startSearchingByText = async (req: Request, res: Response, next: NextFunction) => {
  const { query, maxResults = 600 } = req.body
  if (!query) throw new Error('No search query provided')

  try {
    await telegramService.start()
    const result = await telegramService.searchMessagesInChannel(
      'unityandstrengthkh',
      query,
      new Date('2022-01-01'),
      maxResults,
    )

    res.json({ result })
  } catch (error) {
    next(error)
  }
}

export const startSearchingFacesInTelegramImages = async (req: Request, res: Response, next: NextFunction) => {
  const allMatches = []
  const maxImages = 300
  const batchSize = 20
  let offsetId = 0
  let fetchedSoFar = 0
  const channelUsername = 'unityandstrengthkh'

  try {
    const { imagePath } = req.body
    if (!imagePath) throw new Error('No image path provided')

    const inputDescriptor = await faceDescriptorService.getFaceDescriptor(imagePath)
    if (!inputDescriptor) throw new Error('No face detected in uploaded image')

    await telegramService.start()

    while (fetchedSoFar < maxImages) {
      const imagesBatch = await telegramService.fetchImageBatchFromTelegramChannel({
        channelUsername,
        batchSize,
        minDate: new Date('2022-01-01'),
        offsetId,
      })

      if (imagesBatch.length === 0) break

      // Update offsetId to continue where we left off
      offsetId = parseInt(imagesBatch[imagesBatch.length - 1].meta)

      const matches = await faceMatchesService.findFaceMatches(inputDescriptor, imagesBatch, MIN_SIMILARITY)
      allMatches.push(...matches)

      fetchedSoFar += imagesBatch.length

      // Optional: add delay to reduce API stress
      await delay(1000)
    }

    res.json({ matches: allMatches })
  } catch (error) {
    next(error)
  } finally {
    await deleteTempFolder(TEMP_DIR)
  }
}
