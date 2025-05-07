import { Request, Response, NextFunction } from 'express'
import { YandexSearchService } from '../services/search-engines/yandex-search.service'

const yandexSearchService = new YandexSearchService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  const { imagePath } = req.body

  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' })
  }

  try {
    const results = await yandexSearchService.searchImageOnYandex(imagePath)
    res.json({ results })
  } catch (error) {
    next(error)
  }
}
