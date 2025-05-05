import { Router } from 'express'
import { startSearching } from '../controllers/unitySearchEngineController'

const router = Router()

router.post('/', startSearching)

export default router
