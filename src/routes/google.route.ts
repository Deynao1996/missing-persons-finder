import { Router } from 'express'
import { startSearching } from '../controllers/google.controller'

const router = Router()

router.post('/', startSearching)

export default router
