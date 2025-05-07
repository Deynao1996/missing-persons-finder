import { Request, Response, NextFunction } from 'express'
import { GoogleSearchService } from '../services/search-engines/google-search.service'

const googleSearchService = new GoogleSearchService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  const { imagePath } = req.body

  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' })
  }

  try {
    const results = await googleSearchService.searchImageOnGoogleLens(imagePath)
    res.json({ results })
  } catch (error) {
    next(error)
  }
}
