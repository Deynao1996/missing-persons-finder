import { Browser, Page } from 'puppeteer'
import { BulkSearchResult, ExtractedImage, ScrapedImage, SearchedNames, SearchOptions, WebsiteConfig } from '../types'
import { delay } from '../../../utils/delay.util'
import { ProxyService } from '../../network/proxy.service'
import { NameVariantService } from '../../name-matching/name-variants.service'
import { NameMatcherService } from '../../name-matching/name-matcher.service'
import path from 'path'
import fs from 'fs'
import { FaceDescriptorService } from '../../face-detection/face-descriptor.service'
import { ManifestService } from '../manifest.service'
import { WebImageProcessorService } from '../../image-processor/web-processor.service'

export class UnityWorkerStrategy {
  private proxyService = new ProxyService()
  private nameVariantsService = new NameVariantService()
  private nameMatcherService = new NameMatcherService()
  private imageProcessor = new WebImageProcessorService()
  private faceDescriptorService = new FaceDescriptorService()
  private manifestService = new ManifestService()

  async runWorker(
    workerId: number,
    {
      browser,
      names,
      websites,
      results,
      options,
    }: {
      browser: Browser
      names: SearchedNames[]
      websites: WebsiteConfig[]
      results: BulkSearchResult[]
      options: SearchOptions
    },
  ): Promise<void> {
    for (let i = workerId; i < websites.length; i += options.maxConcurrent || 3) {
      const site = websites[i]
      for (const route of site.routes) {
        await this.processRoute({ browser, site, route, names, results, options })
      }
    }
  }

  private async processRoute({
    browser,
    site,
    route,
    names,
    results,
    options,
  }: {
    browser: Browser
    site: WebsiteConfig
    route: string
    names: SearchedNames[]
    results: BulkSearchResult[]
    options: SearchOptions
  }): Promise<void> {
    const page = await browser.newPage()
    const url = route.startsWith('http') ? route : `${site.baseUrl}${route}`

    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'uk-UA,uk;q=0.9',
        'X-Forwarded-For': this.proxyService.generateUkrainianIP(),
      })

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeout || 20000,
      })

      if (site.nameSelectors?.length) {
        await Promise.race([
          Promise.all(site.nameSelectors.map((sel) => page.waitForSelector(sel, { timeout: 5000 }))),
          delay(3000),
        ])
      }

      for (const name of names) {
        await this.checkNameMatchOnPage({ page, name, site, url, results })
      }
    } catch (error) {
      console.error(`Error searching ${url}:`, error)
    } finally {
      await page.close()
      await delay(2000 + Math.random() * 3000)
    }
  }

  private async checkNameMatchOnPage({
    page,
    name,
    site,
    url,
    results,
  }: {
    page: Page
    name: SearchedNames
    site: WebsiteConfig
    url: string
    results: BulkSearchResult[]
  }): Promise<void> {
    const variants = this.nameVariantsService.generateUkrainianNameVariants(name.firstName, name.lastName)
    const found = await this.nameMatcherService.checkNameOnPage(page, variants, site.nameSelectors)

    if (found.matches.length > 0) {
      const result = results.find((r) => r.name === `${name.firstName} ${name.lastName}`)
      result?.results.push({
        website: new URL(site.baseUrl).hostname,
        url,
        found: true,
        ...found,
      })
    }
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

          await this.imageProcessor.downloadAndProcessImage(img.src, filepath, { targetFormat: 'jpeg' })

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
}
