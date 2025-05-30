import { Router } from 'express'
import { initializeTelegramCache, initializeWebCache, updateCache } from '../controllers/cache.controller'

const router = Router()

router.post('/telegram-init', initializeTelegramCache)
router.post('/web-init', initializeWebCache)

router.post('/update', updateCache)

export default router
