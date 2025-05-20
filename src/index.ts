import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import googleSearchEngineRoutes from './routes/google.route'
import cacheChannelRoutes from './routes/cache.route'
import telegramQueryRoutes from './routes/telegram-query.route'
import { handleErrors } from './middlewares/handle-errors.middleware'
import { initFaceAPI } from './utils/face-api/init-face.util'

dotenv.config()
const PORT = process.env.PORT || 5000

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/google-search', googleSearchEngineRoutes)
app.use('/api/cache-channel', cacheChannelRoutes)
app.use('/api/telegram-query', telegramQueryRoutes)

app.use(handleErrors())

app.get('/', (_, res) => {
  res.send('Missing Persons Finder API is running...')
})

initFaceAPI()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ FaceAPI initialized`)
      console.log(`🚀 Server is running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ Failed to load face-api models:', err)
    process.exit(1) // Exit if model loading fails
  })
