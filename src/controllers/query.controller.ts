import { Request, Response, NextFunction } from 'express'
import { TelegramQuerySearchService } from '../services/search/telegram/telegram-query-search.service'
import { TelegramFaceSearchService } from '../services/search/telegram/telegram-face-search.service'
import { WebSearchService } from '../services/search/web/web-search.service'
import { WEB_PRIMARY_CACHE_FILE, WEB_SECONDARY_CACHE_FILE } from '../constants'
import { PersonsDataService } from '../services/persons/persons-data.service'
import { PaginatePagesService } from '../services/paginate/paginate-pages.service'

//TODO: TODO: Add more specific search for text query

const telegramQuerySearch = new TelegramQuerySearchService()
const telegramFaceSearch = new TelegramFaceSearchService()
const webSearch = new WebSearchService()
const personsData = new PersonsDataService()
const paginatePages = new PaginatePagesService()

export const startSearchingByTextQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, all, page = 1, pageSize = 10 } = req.body
    const { persons, paged } = await paginatePages.getPagedPersons(query, all, page, pageSize)

    const allResults = []

    for (const { id, fullName } of paged) {
      const primary = await webSearch.searchWebCache(
        fullName,
        id,
        process.env.SOURCE_PRIMARY_NAME!,
        WEB_PRIMARY_CACHE_FILE,
      )

      const secondary = await webSearch.searchWebCache(
        fullName,
        id,
        process.env.SOURCE_SECONDARY_NAME!,
        WEB_SECONDARY_CACHE_FILE,
      )

      const telegram = await telegramQuerySearch.performTextSearch(fullName, id)

      const results = { ...secondary, ...primary, ...telegram }

      await telegramQuerySearch.logSearchSession(fullName, results, id)
      await telegramQuerySearch.temporarilyMarkAsReviewed(id, results)

      allResults.push({ fullName, id, results })
    }

    res.json({
      totalPersons: persons.length,
      page,
      pageSize,
      hasMore: persons.length > page * pageSize,
      results: allResults,
    })
  } catch (error) {
    next(error)
  }
}

export const startSearchingByImagePath = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, all, minYear, page = 1, pageSize = 10 } = req.body
    const { persons, paged } = await paginatePages.getPagedPersons(query, all, page, pageSize)

    const allResults = []

    for (const { fullName, imagePath, id } of paged) {
      const queryId = imagePath

      const { results, totalMatches } = await telegramFaceSearch.searchByImage(
        imagePath,
        imagePath,
        minYear ? parseInt(minYear, 10) : undefined,
      )

      await telegramFaceSearch.logResults(imagePath, results, queryId)
      await telegramFaceSearch.temporaryMarkAsReviewed(queryId, results)

      allResults.push({ fullName, id, totalMatches, results })
    }

    res.json({
      totalPersons: persons.length,
      page,
      pageSize,
      hasMore: persons.length > page * pageSize,
      results: allResults,
    })
  } catch (error) {
    next(error)
  }
}

//TODO: Add a combine search if need
export const runCombinedSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const person = await personsData.getPersonData()
    if (!person) return res.status(404).json({ error: 'No person folders found' })

    const { fullName, imagePath, id } = person

    console.log('▶️ Running text + image search for:', fullName)

    const faceResult = await telegramFaceSearch.searchByImage(imagePath, id)
    // const textResult = await telegramQuerySearch.performTextSearch(fullName, id)

    // Optionally log both
    // await telegramFaceSearch.logResults(imagePath, faceResult.results, id)
    // await telegramQuerySearch.logSearchSession(fullName, textResult, id)

    // await telegramFaceSearch.temporaryMarkAsReviewed(id, faceResult.results)
    // await telegramQuerySearch.temporarilyMarkAsReviewed(id, textResult)

    res.json({
      textQuery: fullName,
      textResults: {},
      faceResults: faceResult,
    })
  } catch (err) {
    next(err)
  }
}
