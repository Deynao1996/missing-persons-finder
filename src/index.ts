import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import yandexSearchEngineRoutes from './routes/yandexSearchEngineRoutes'
import unitySearchEngineRoutes from './routes/unitySearchEngineRoutes'
import telegramRoutes from './routes/telegram'
import { handleErrors } from './middlewares/handleErrors'

dotenv.config()
const PORT = process.env.PORT || 5000

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/yandex-search', yandexSearchEngineRoutes)
app.use('/api/unity-search', unitySearchEngineRoutes)
app.use('/api/search-tg', telegramRoutes)

app.use(handleErrors())

app.get('/', (req, res) => {
  res.send('Missing Persons Finder API is running...')
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

//TODO: Start with proxy rotation and emergency wipe (safety first)
//TODO: Implement basic caching
//TODO: Complete Red Cross API integration
