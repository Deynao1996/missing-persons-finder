import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import yandexSearchEngineRoutes from './routes/yandex.route'
import unitySearchEngineRoutes from './routes/unity.route'
import googleSearchEngineRoutes from './routes/google.route'
import telegramSearchEngineRoutes from './routes/telegram.route'
import { handleErrors } from './middlewares/handle-errors.middleware'
import { initFaceAPI } from './utils/face-api/init-face.util'

//TODO: TODAY: Check multiple batches in one request for website for text
//TODO: TODAY: Check multiple batches in one request for website for images

//TODO: TODAY: Check multiple batches in one request for telegram for text
//TODO: TODAY: Check multiple batches in one request for telegram for images
//TODO: Check one request for search for text
//TODO: Check one request for search for images

dotenv.config()
const PORT = process.env.PORT || 5000

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/yandex-search', yandexSearchEngineRoutes)
app.use('/api/google-search', googleSearchEngineRoutes)
app.use('/api/unity-search', unitySearchEngineRoutes)
app.use('/api/telegram-search', telegramSearchEngineRoutes)

app.use(handleErrors())

app.get('/', (_, res) => {
  res.send('Missing Persons Finder API is running...')
})

// app.listen(PORT, () => {
//   console.log(`✅ FaceAPI initialized`)
//   console.log(`🚀 Server is running on http://localhost:${PORT}`)
// })

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
