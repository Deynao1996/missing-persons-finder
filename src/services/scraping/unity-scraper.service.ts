import puppeteer from 'puppeteer'
import { BulkAcrossWebsites, BulkSearchResult, ScrapLargeVolume, ScrapedImage } from './types'
import { autoScroll } from '../../utils/puppeteer/auto-scroll.util'
import path from 'path'
import fs from 'fs'
import { ImageProcessorService } from './image-processor.service'
import { ProxyService } from '../network/proxy.service'
import { UnityWorkerStrategy } from './strategies/unity-worker.strategy'

export class UnityScraperService {
  private imageProcessor = new ImageProcessorService()
  private proxyService = new ProxyService()
  private workerStrategy = new UnityWorkerStrategy()

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
      const combinedImages = await this.imageProcessor.extractImagesFromPage(page, options.backgroundSelectors)
      const validImages = await this.imageProcessor.getValidImages(combinedImages, options)

      // Process in batches (avoid memory overload)
      for (let i = 0; i < validImages.length; i += options.batchSize || 10) {
        const batch = validImages.slice(i, i + (options.batchSize || 10))
        const batchResults = await this.workerStrategy.processImageBatch(
          batch,
          baseUrl,
          route,
          routeDir,
          routeSlug,
          manifestsDir,
          i,
        )
        allResults.push(...batchResults)
      }

      await page.close()
    }

    await browser.close()
    return allResults
  }

  async bulkTextSearchAcrossWebsites({
    names,
    websites,
    options = {},
  }: BulkAcrossWebsites): Promise<BulkSearchResult[]> {
    const results: BulkSearchResult[] = names.map((name) => ({
      name: `${name.firstName} ${name.lastName}`,
      results: [],
    }))

    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        ...(options.proxyRotate ? [this.proxyService.getCurrentProxy()] : []),
      ],
    })

    const workerPool = Array(options.maxConcurrent || 3).fill(null)

    await Promise.all(
      workerPool.map((_, workerId) =>
        this.workerStrategy.runWorker(workerId, {
          browser,
          names,
          websites,
          results,
          options,
        }),
      ),
    )

    await browser.close()
    return results
  }
}
