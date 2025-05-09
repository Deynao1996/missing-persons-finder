import { Router } from 'express'
import { startSearching } from '../controllers/yandex.controller'

const router = Router()

router.post('/', startSearching)

export default router
