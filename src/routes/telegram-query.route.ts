import { Router } from 'express'
import {
  runCombinedSearch,
  startSearchingByImagePath,
  startSearchingByTextQuery,
} from '../controllers/telegram-query.controller'

const router = Router()

router.post('/', startSearchingByTextQuery)

router.post('/by-image', startSearchingByImagePath)

router.post('/combine-search', runCombinedSearch)

export default router
