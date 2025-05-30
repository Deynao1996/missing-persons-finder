import { Request, Response, NextFunction } from 'express'
import { TelegramQuerySearchService } from '../services/search/telegram/telegram-query-search.service'
import { TelegramFaceSearchService } from '../services/search/telegram/telegram-face-search.service'
import { getPersonData } from '../utils/get-person-data.util'
import { WebSearchService } from '../services/search/web/web-search.service'

const telegramQuerySearch = new TelegramQuerySearchService()
const telegramFaceSearch = new TelegramFaceSearchService()
const webSearch = new WebSearchService()

export const startSearchingByTextQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body

    // Validate input
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    const person = await getPersonData(Number(query))
    if (!person) return res.status(404).json({ error: 'No person folders found' })

    const { fullName, id } = person

    // Process search
    const textResultsFromWeb = await webSearch.searchWebCache(fullName, id, process.env.SOURCE_NAME!)
    const textResultFromTelegram = await telegramQuerySearch.performTextSearch(fullName, id)
    const results = { ...textResultsFromWeb, ...textResultFromTelegram }

    // Logs results
    await telegramQuerySearch.logSearchSession(query, results, id)
    await telegramQuerySearch.temporarilyMarkAsReviewed(id, results)

    return res.json({ fullName, results })
  } catch (error) {
    next(error)
  }
}

export const startSearchingByImagePath = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // const { imagePath, minYear } = req.body
    const { minYear, query } = req.body

    const person = await getPersonData(Number(query))
    if (!person) return res.status(404).json({ error: 'No person folders found' })

    const { fullName, imagePath, id } = person

    // Process search
    const { results, totalMatches } = await telegramFaceSearch.searchByImage(
      imagePath,
      imagePath,
      minYear ? parseInt(minYear, 10) : undefined,
    )
    const queryId = imagePath

    // Log results
    // await telegramFaceSearch.logResults(imagePath, results, queryId)

    //TODO: Remove for production
    // Temporary auto-review (remove for production)
    // await telegramFaceSearch.temporaryMarkAsReviewed(queryId, results)

    res.json({ results, totalMatches, fullName })
  } catch (error) {
    next(error)
  }
}

export const runCombinedSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const person = await getPersonData()
    if (!person) return res.status(404).json({ error: 'No person folders found' })

    const { fullName, imagePath, id } = person

    console.log('▶️ Running text + image search for:', fullName)

    const faceResult = await telegramFaceSearch.searchByImage(imagePath, id)
    const textResult = await telegramQuerySearch.performTextSearch(fullName, id)

    // Optionally log both
    await telegramFaceSearch.logResults(imagePath, faceResult.results, id)
    await telegramQuerySearch.logSearchSession(fullName, textResult, id)

    await telegramFaceSearch.temporaryMarkAsReviewed(id, faceResult.results)
    await telegramQuerySearch.temporarilyMarkAsReviewed(id, textResult)

    res.json({
      textQuery: fullName,
      textResults: textResult,
      faceResults: faceResult,
    })
  } catch (err) {
    next(err)
  }
}
