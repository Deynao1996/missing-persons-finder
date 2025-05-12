import { Router } from 'express'
import { handleCombinedSearch } from '../controllers/combine-search.controller'

const router = Router()

router.post('/', handleCombinedSearch)

export default router
