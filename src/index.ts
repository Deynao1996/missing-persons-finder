import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import searchEngineRoutes from './routes/searchEngine'
import telegramRoutes from './routes/telegram'
import { handleErrors } from './middlewares/handleErrors'

dotenv.config()
const PORT = process.env.PORT || 5000

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/search-engine', searchEngineRoutes)
app.use('/api', telegramRoutes)

app.use(handleErrors())

app.get('/', (req, res) => {
  res.send('Missing Persons Finder API is running...')
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
