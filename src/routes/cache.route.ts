import { Router } from 'express'
import { initializeCache, updateCache } from '../controllers/cache.controller'

const router = Router()

router.post('/', initializeCache)

router.post('/update', updateCache)

export default router
