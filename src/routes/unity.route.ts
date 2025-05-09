import { Router } from 'express'
import { startSearchingByText, startSearchingByImage } from '../controllers/unity.controller'

const router = Router()

router.post('/', startSearchingByText)

router.post('/by-image', startSearchingByImage)

export default router
