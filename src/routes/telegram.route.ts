import { Router } from 'express'
import { startSearchingByImage, startSearchingByText } from '../controllers/telegram.controller'

const router = Router()

router.post('/', startSearchingByText)

router.post('/by-image', startSearchingByImage)

export default router
