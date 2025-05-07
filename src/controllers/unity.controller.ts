import { Request, Response, NextFunction } from 'express'
import { FULLNAME_FOR_SEARCH, SEARCHING_WEBSITES, TEMP_DIR } from '../constants'
import { UnityScraperService } from '../services/scraping/unity-scraper.service'
import { FaceDescriptorService } from '../services/face-detection/face-descriptor.service'
import { FaceMatchesService } from '../services/face-detection/face-matches.service'
import { deleteTempFolder } from '../utils/delete-temp.util'

const scraperService = new UnityScraperService()
const faceDescriptorService = new FaceDescriptorService()
const faceMatchesService = new FaceMatchesService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await scraperService.bulkTextSearchAcrossWebsites({
      names: FULLNAME_FOR_SEARCH,
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
    const { imagePath } = req.body
    if (!imagePath) throw new Error('No image path provided')

    // 1. Process input image
    const inputDescriptor = await faceDescriptorService.getFaceDescriptor(imagePath)
    if (!inputDescriptor) throw new Error('No face detected in uploaded image')

    const scrapedImages = await scraperService.scrapeLargeImageVolumeFromUnity({
      baseUrl: 'https://www.unityandstrength.in.ua',
      routes: ['/', '/pro-nas'],
      options: {
        outputDir: TEMP_DIR,
        maxImages: 150,
        batchSize: 15,
        minDimensions: { width: 150, height: 150 },
        // backgroundSelectors: ['.elementor-carousel-image'],
      },
    })

    const imagesForSearch = scrapedImages.map((img) => {
      return {
        filepath: img.filepath,
        route: img.url,
        sourceImageUrl: img.imageUrl,
      }
    })

    const matches = await faceMatchesService.findFaceMatches(
      inputDescriptor,
      imagesForSearch,
      0.3, // Minimum similarity threshold
    )

    res.json({ matches })
  } catch (error) {
    next(error)
  } finally {
    await deleteTempFolder(TEMP_DIR)
  }
}
