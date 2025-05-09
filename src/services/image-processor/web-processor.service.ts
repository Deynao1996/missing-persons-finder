import path from 'path'
import puppeteer, { Page } from 'puppeteer'
import sharp from 'sharp'
import { ExtractedImage, ScrapedImage, ScrapLargeVolume } from './types'
import { FaceDescriptorService } from '../face-detection/face-descriptor.service'
import { ManifestService } from '../scraping/manifest.service'
import fs from 'fs'
import { delay } from '../../utils/delay.util'
import { autoScroll } from '../../utils/puppeteer/auto-scroll.util'
import { WebsiteForSearch } from '../scraping/types'
import { BATCH_SIZE, TEMP_DIR } from '../../constants'

export class WebImageProcessorService {
  private faceDescriptorService = new FaceDescriptorService()
  private manifestService = new ManifestService()

  async downloadAndProcessImage(
    url: string,
    outputPath: string,
    options: {
      targetFormat?: 'webp' | 'jpeg'
      quality?: number
      width?: number
      height?: number
    } = {},
  ): Promise<{ processedPath: string; originalFormat: string }> {
    try {
      // 1. Download the image
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      const buffer = await response.arrayBuffer()

      // 2. Determine original format
      const image = sharp(Buffer.from(buffer))
      const metadata = await image.metadata()
      const originalFormat = metadata.format || 'jpeg'
      const outputFormat = options.targetFormat || originalFormat

      // 3. Process with sharp
      const sharpInstance = sharp(Buffer.from(buffer)).resize(options.width || 800, options.height || 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })

      // 4. Convert if needed and save
      let processedPath = outputPath
      if (path.extname(outputPath) !== `.${outputFormat}`) {
        processedPath = outputPath.replace(/\.[^.]+$/, `.${outputFormat}`)
      }

      await (
        outputFormat === 'webp'
          ? sharpInstance.webp({ quality: options.quality || 85 })
          : sharpInstance.jpeg({ quality: options.quality || 90 })
      ).toFile(processedPath)

      return {
        processedPath,
        originalFormat,
      }
    } catch (error) {
      console.error(`Error processing ${url}:`, error)
      throw error
    }
  }

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

  async processImageBatch(
    batch: ExtractedImage[],
    baseUrl: string,
    route: string,
    routeDir: string,
    routeSlug: string,
    manifestsDir: string,
    startIndex: number,
  ): Promise<ScrapedImage[]> {
    const results: ScrapedImage[] = []

    await Promise.all(
      batch.map(async (img, idx) => {
        try {
          const filename = `${Date.now()}_${startIndex + idx}.jpeg`
          const filepath = path.join(routeDir, filename)

          await this.downloadAndProcessImage(img.src, filepath, { targetFormat: 'jpeg' })

          const descriptor = await this.faceDescriptorService.getFaceDescriptor(filepath)

          if (!descriptor) {
            await fs.promises.unlink(filepath)
            console.log(`No face found in ${img.src}, skipping.`)
            return
          }

          results.push({
            url: `${baseUrl}${route}`,
            imageUrl: img.src,
            filepath,
            timestamp: new Date().toISOString(),
            route,
            metadata: {
              width: img.width,
              height: img.height,
              altText: img.alt,
            },
          })
        } catch (error) {
          console.error(`Failed image ${img.src}:`, error)
        }
      }),
    )

    this.manifestService.saveRouteManifest(routeSlug, results, manifestsDir)
    await delay(1000 + Math.random() * 2000) // Throttle
    return results
  }

  async scrapeLargeImageVolumeFromUnity({ baseUrl, options = {}, routes }: ScrapLargeVolume): Promise<ScrapedImage[]> {
    // Configure directories
    const outputDir = options.outputDir || './scraped_data'
    const rawDir = path.join(outputDir, 'raw_images')
    const manifestsDir = path.join(outputDir, 'manifests')

    ;[outputDir, rawDir, manifestsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    })

    const browser = await puppeteer.launch({
      headless: false,
      args: ['--disable-dev-shm-usage'], // Critical for large volumes
    })

    const allResults: ScrapedImage[] = []

    for (const route of routes) {
      const routeSlug = route.replace(/\W+/g, '_').slice(0, 30)
      const routeDir = path.join(rawDir, routeSlug)
      if (!fs.existsSync(routeDir)) fs.mkdirSync(routeDir)

      const page = await browser.newPage()
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Scroll to load lazy images
      await autoScroll(page)

      // Extract image elements with metadata
      const combinedImages = await this.extractImagesFromPage(page, options.backgroundSelectors)
      const validImages = await this.getValidImages(combinedImages, options)

      // Process in batches (avoid memory overload)
      for (let i = 0; i < validImages.length; i += options.batchSize || 10) {
        const batch = validImages.slice(i, i + (options.batchSize || 10))
        const batchResults = await this.processImageBatch(batch, baseUrl, route, routeDir, routeSlug, manifestsDir, i)
        allResults.push(...batchResults)
      }

      await page.close()
    }

    await browser.close()
    return allResults
  }

  async scrapeImagesFromRoute(site: WebsiteForSearch, routeIndex: number) {
    const scrapeOptions = {
      outputDir: TEMP_DIR,
      maxImages: BATCH_SIZE,
      batchSize: 5,
      minDimensions: { width: 150, height: 150 },
      backgroundSelectors: site.backgroundSelectors,
    }

    const images = await this.scrapeLargeImageVolumeFromUnity({
      baseUrl: site.baseUrl,
      routes: [site.routes[routeIndex]],
      options: scrapeOptions,
    })

    return images.map((img) => ({
      filepath: img.filepath,
      meta: img.url,
      sourceImageUrl: img.imageUrl,
    }))
  }
}
