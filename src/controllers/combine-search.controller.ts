import { Request, Response, NextFunction } from 'express'
import { TelegramScraperService } from '../services/scraping/telegram-scrapper.service'
import {
  BATCH_SIZE,
  MAX_IMAGES,
  MIN_SIMILARITY,
  SEARCH_TELEGRAM_FROM,
  SEARCHED_TELEGRAM_CHANNEL,
  SEARCHING_WEBSITES,
} from '../constants'
import { UnityScraperService } from '../services/scraping/unity-scraper.service'
import { FaceDescriptorService } from '../services/face-detection/face-descriptor.service'
import { FaceMatchesService } from '../services/face-detection/face-matches.service'
import { delay } from '../utils/delay.util'
import { TextMatchResult } from '../services/scraping/types'
import { NameVariantService } from '../services/name-matching/name-variants.service'
import { YandexSearchService } from '../services/search-engines/yandex-search.service'

const telegramService = new TelegramScraperService()
const scraperService = new UnityScraperService()
const faceDescriptorService = new FaceDescriptorService()
const faceMatchesService = new FaceMatchesService()
const nameVariantService = new NameVariantService()
const yandexSearchService = new YandexSearchService()

export const handleCombinedSearch = async (req: Request, res: Response, next: NextFunction) => {
  const { query, imagePath, maxResults = 600 } = req.body

  const effectiveMaxResults = maxResults ?? Infinity
  const effectiveMaxImages = MAX_IMAGES ?? Infinity

  const textResults: TextMatchResult[] = []
  const faceMatches: any[] = []

  try {
    if (!query && !imagePath) throw new Error('You must provide a text query or an image path')

    // Start Telegram bot only if needed
    if (query || imagePath) {
      await telegramService.start()
    }

    // --- TEXT SEARCH ---
    if (query) {
      // Telegram channel search
      const { firstName, lastName } = nameVariantService.parseNameQuery(query)
      const telegramTextResults = await telegramService.searchMessagesInChannel(
        SEARCHED_TELEGRAM_CHANNEL,
        {
          firstName,
          lastName,
        },
        new Date(SEARCH_TELEGRAM_FROM),
        effectiveMaxResults,
      )

      // Website search
      // const websiteTextResults = await scraperService.bulkTextSearchAcrossWebsites({
      //   name: {
      //     firstName,
      //     lastName,
      //   },
      //   websites: SEARCHING_WEBSITES,
      //   options: { maxConcurrent: 3, proxyRotate: true },
      // })
      textResults.push(...telegramTextResults)
    }

    // --- IMAGE SEARCH ---
    if (imagePath) {
      const inputDescriptor = await faceDescriptorService.getFaceDescriptor(imagePath)
      if (!inputDescriptor) throw new Error('No face detected in uploaded image')

      // Website image search
      const websiteMatches = await scraperService.performImageSearch(imagePath)

      // Telegram image search
      // const allMatches = []
      let offsetId = 0
      let fetchedSoFar = 0

      // while (fetchedSoFar < effectiveMaxImages) {
      //   const imagesBatch = await telegramService.fetchImageBatchFromTelegramChannel({
      //     channelUsername: SEARCHED_TELEGRAM_CHANNEL,
      //     batchSize: BATCH_SIZE,
      //     minDate: new Date(SEARCH_TELEGRAM_FROM),
      //     offsetId,
      //   })

      //   if (imagesBatch.length === 0) break
      //   offsetId = parseInt(imagesBatch[imagesBatch.length - 1].meta)
      //   const matches = await faceMatchesService.findFaceMatches(inputDescriptor, imagesBatch, MIN_SIMILARITY)
      //   allMatches.push(...matches)
      //   fetchedSoFar += imagesBatch.length

      //   await delay(1000)
      // }

      faceMatches.push(...websiteMatches)
    }

    // --- YANDEX IMAGE SEARCH ---
    // const yandexMatches = await yandexSearchService.searchImageOnYandex(imagePath)

    res.json({
      textResults,
      faceMatches,
    })
  } catch (error) {
    next(error)
  }
}
