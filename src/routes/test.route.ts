import { Router } from 'express'
import { startSearching } from '../controllers/test.controller'

const router = Router()

router.post('/', startSearching)

export default router
