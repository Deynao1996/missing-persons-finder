import { Router } from 'express'
import { startSearchingTGChannel } from '../controllers/telegramScrapController'

const router = Router()

router.post('/', startSearchingTGChannel)

export default router
