import { Router } from 'express'
import { startSearchingFacesInTelegramImages, startSearchingByText } from '../controllers/telegram.controller'

const router = Router()

router.post('/', startSearchingByText)

router.post('/by-image', startSearchingFacesInTelegramImages)

export default router
