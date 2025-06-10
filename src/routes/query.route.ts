import { Router } from 'express'
import {
  runCombinedSearch,
  startSearchingByImagePath,
  startSearchingByTextFromDataQuery,
  startSearchingByTextFromQuery,
} from '../controllers/query.controller'

const router = Router()

router.post('/data/by-full-name', startSearchingByTextFromDataQuery)

router.post('/data/by-image', startSearchingByImagePath)

router.post('/by-full-name', startSearchingByTextFromQuery)

router.post('/by-image', startSearchingByImagePath)

router.post('/combine-search', runCombinedSearch)

export default router
