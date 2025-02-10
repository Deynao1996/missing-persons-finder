import { Router } from 'express'
import { startSearching } from '../controllers/searchEngineController'

//TODO: Check if VPN need

const router = Router()

router.post('/', startSearching)

export default router
