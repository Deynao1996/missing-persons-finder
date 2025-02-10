import { Router } from 'express'
import { fetchTelegramMessages } from '../utils/telegramScraper'

const router = Router()

router.get('/telegram', async (req, res) => {
  const { channel } = req.query

  if (!channel) {
    return res.status(400).json({ error: 'Channel name is required' })
  }

  try {
    const messages = await fetchTelegramMessages(channel as string)
    res.json({ messages })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Telegram messages' })
  }
})

export default router
