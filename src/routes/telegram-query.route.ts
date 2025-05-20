import { Router } from 'express'
import { startSearching as startSearchingByQuery } from '../controllers/telegram-query.controller'
import { startSearching as startSearchingByImage } from '../controllers/telegram-image.controller'

const router = Router()

router.post('/', startSearchingByQuery)

router.post('/by-image', startSearchingByImage)

export default router
