import { Request, Response, NextFunction } from 'express'
import { TelegramQuerySearchService } from '../services/search/telegram/telegram-query-search.service'
import { TelegramFaceSearchService } from '../services/search/telegram/telegram-face-search.service'
import { getPersonData } from '../utils/get-person-data.util'

const telegramQuerySearch = new TelegramQuerySearchService()
const telegramFaceSearch = new TelegramFaceSearchService()

export const startSearchingByTextQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body

    // Validate input
    // if (!query) {
    //   return res.status(400).json({ error: 'Search query is required' })
    // }

    const person = await getPersonData(Number(query))
    if (!person) return res.status(404).json({ error: 'No person folders found' })

    const { fullName, imagePath, id } = person

    // const queryId = query.trim().toLocaleLowerCase()

    // Process search
    // const searchResults = await telegramQuerySearch.performTextSearch(query, queryId)
    const textResult = await telegramQuerySearch.performTextSearch(fullName, id)

    // Log results
    // await telegramQuerySearch.logSearchSession(query, searchResults, queryId)

    // Temporary auto-review (remove for production)
    // await telegramQuerySearch.temporarilyMarkAsReviewed(queryId, searchResults)

    return res.json({ fullName, results: textResult })
  } catch (error) {
    next(error)
  }
}

export const startSearchingByImagePath = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imagePath, minYear } = req.body

    // Process search
    const { results, totalMatches } = await telegramFaceSearch.searchByImage(
      imagePath,
      imagePath,
      minYear ? parseInt(minYear, 10) : undefined,
    )
    const queryId = imagePath

    // Log results
    await telegramFaceSearch.logResults(imagePath, results, queryId)

    //TODO: Remove for production
    // Temporary auto-review (remove for production)
    await telegramFaceSearch.temporaryMarkAsReviewed(queryId, results)

    res.json({ results, totalMatches })
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
