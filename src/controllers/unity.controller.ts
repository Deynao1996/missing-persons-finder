import { Request, Response, NextFunction } from 'express'
import { SEARCHING_WEBSITES, TEMP_DIR } from '../constants'
import { UnityScraperService } from '../services/scraping/unity-scraper.service'
import { deleteTempFolder } from '../utils/delete-temp.util'

const scraperService = new UnityScraperService()

export const startSearchingByText = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await scraperService.bulkTextSearchAcrossWebsites({
      name: {
        firstName: '',
        lastName: '',
      },
      websites: SEARCHING_WEBSITES,
      options: {
        maxConcurrent: 3,
        proxyRotate: true,
      },
    })
    res.json({ result })
  } catch (error) {
    next(error)
  }
}

export const startSearchingByImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await scraperService.performImageSearch(req.body.imagePath)
    res.json({ matches })
  } catch (error) {
    next(error)
  } finally {
    await deleteTempFolder(TEMP_DIR)
  }
}
