import { Router } from 'express'
import { startSearching } from '../controllers/telegram.controller'

const router = Router()

router.post('/', startSearching)

export default router
