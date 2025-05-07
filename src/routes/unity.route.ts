import { Router } from 'express'
import { startSearching, startSearchingByImage } from '../controllers/unity.controller'

const router = Router()

router.post('/', startSearching)

router.post('/by-image', startSearchingByImage)

export default router
