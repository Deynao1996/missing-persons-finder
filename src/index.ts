import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import cacheChannelRoutes from './routes/cache.route'
import queryRoutes from './routes/query.route'
import testQueryRoutes from './routes/test.route'
import { handleErrors } from './middlewares/handle-errors.middleware'
import { initFaceAPI } from './utils/face-api/init-face.util'

dotenv.config()
const PORT = process.env.PORT || 4000

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/cache', cacheChannelRoutes)
app.use('/api/query', queryRoutes)
app.use('/api/test', testQueryRoutes)

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
