import { Router } from 'express'
import { startSearching } from '../controllers/yandex.controller'

//TODO: Check if VPN need

const router = Router()

router.post('/', startSearching)

export default router
