import puppeteer, { Page } from 'puppeteer'
import { BatchedImage, ExtractedImage, ScrapedImage, ScrapLargeVolume } from './types'
import { FaceDescriptorService } from '../face-detection/face-descriptor.service'
import { delay } from '../../utils/delay.util'
import { autoScroll } from '../../utils/puppeteer/auto-scroll.util'
import { WebsiteForSearch } from '../scraping/types'
import { BATCH_SIZE } from '../../constants'
import { ImageProcessorService } from './image-processor.service'
import { downloadImageBuffer } from '../../utils/download-image-buffer.util'

export class WebImageProcessorService {
  private faceDescriptorService = new FaceDescriptorService()
  private imageProcessor = new ImageProcessorService()

  async extractImagesFromPage(page: Page, backgroundSelectors?: string[]) {
    const imageElements = await page.$$eval('img', (imgs) =>
      imgs.map((img) => ({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })),
    )

    const backgroundElements = backgroundSelectors?.length
      ? await page.$$eval(backgroundSelectors.join(', '), (elements) =>
          elements
            .map((el) => {
              const style = window.getComputedStyle(el)
              const match = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/i)
              return match
                ? {
                    src: match[1],
                    alt: '',
                    width: el.clientWidth,
                    height: el.clientHeight,
                  }
                : null
            })
            .filter((el): el is { src: string; alt: string; width: number; height: number } => el !== null),
        )
      : []

    const combined = [...imageElements, ...backgroundElements]
    return combined.reduce((unique: typeof imageElements, current) => {
      const isDuplicate = unique.some(
        (img) => img.src.localeCompare(current.src, undefined, { sensitivity: 'base' }) === 0,
      )
      return isDuplicate ? unique : [...unique, current]
    }, [])
  }

  async getValidImages(images: ExtractedImage[], options: any) {
    return images
      .filter(
        (img) =>
          img.src &&
          img.width >= (options.minDimensions?.width || 200) &&
          img.height >= (options.minDimensions?.height || 200) &&
          !img.src.match(/logo|icon|button|spinner|svg/i),
      )
      .slice(0, options.maxImages || 100)
  }

  async processImageBatchInMemory(batch: ExtractedImage[], baseUrl: string, route: string): Promise<ScrapedImage[]> {
    const results: ScrapedImage[] = []

    await Promise.all(
      batch.map(async (img) => {
        try {
          const imageBuffer = await downloadImageBuffer(img.src)

          // Process the image using your sharp-based utility
          const processedBuffer = await this.imageProcessor.processImageBuffer(imageBuffer, {
            targetFormat: 'jpeg',
            quality: 85,
            width: 800,
            height: 800,
          })

          // Try to extract face descriptor
          const descriptor = await this.faceDescriptorService.getFaceDescriptor(processedBuffer)

          if (!descriptor) {
            console.log(`❌ No face detected in image ${img.src}, skipping.`)
            return
          }

          results.push({
            url: `${baseUrl}${route}`,
            imageUrl: img.src,
            buffer: processedBuffer,
            timestamp: new Date().toISOString(),
            route,
            metadata: {
              width: img.width,
              height: img.height,
              altText: img.alt,
            },
          })
        } catch (err) {
          console.warn(`⚠️ Failed to process ${img.src}:`, err)
        }
      }),
    )
    await delay(1000 + Math.random() * 2000)
    return results
  }

  async scrapeLargeImageVolumeFromUnityInMemory({
    baseUrl,
    routes,
    options = {},
  }: ScrapLargeVolume): Promise<Array<ScrapedImage>> {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--disable-dev-shm-usage'],
    })

    const allResults = []

    for (const route of routes) {
      const page = await browser.newPage()
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      await autoScroll(page)

      const combinedImages = await this.extractImagesFromPage(page, options.backgroundSelectors)
      const validImages = await this.getValidImages(combinedImages, options)

      for (let i = 0; i < validImages.length; i += options.batchSize || 10) {
        const batch = validImages.slice(i, i + (options.batchSize || 10))
        const batchResults = await this.processImageBatchInMemory(batch, baseUrl, route)
        allResults.push(...batchResults)
      }

      await page.close()
    }

    await browser.close()
    return allResults
  }

  async scrapeImagesFromRouteInMemory(site: WebsiteForSearch, routeIndex: number): Promise<BatchedImage[]> {
    const scrapeOptions = {
      maxImages: BATCH_SIZE,
      batchSize: 5,
      minDimensions: { width: 150, height: 150 },
      backgroundSelectors: site.backgroundSelectors,
    }

    const scrapedImages = await this.scrapeLargeImageVolumeFromUnityInMemory({
      baseUrl: site.baseUrl,
      routes: [site.routes[routeIndex]],
      options: scrapeOptions,
    })

    return scrapedImages.map((img) => ({
      imageBuffer: img.buffer,
      meta: img.url,
      sourceImageUrl: img.imageUrl,
    }))
  }
}
