import { Browser, Page } from 'puppeteer'
import {
  FaceMatcherResult,
  PartialSearchedName,
  SearchOptions,
  TextMatchResult,
  WebsiteConfig,
  WebsiteForSearch,
} from '../types'
import { delay } from '../../../utils/delay.util'
import { ProxyService } from '../../network/proxy.service'
import { NameVariantService } from '../../name-matching/name-variants.service'
import { NameMatcherService } from '../../name-matching/name-matcher.service'
import { WebImageProcessorService } from '../../image-processor/web-processor.service'
import { MIN_SIMILARITY, MAX_IMAGES } from '../../../constants'
import { FaceMatchesService } from '../../face-detection/face-matches.service'

export class WebWorkerStrategy {
  private proxyService = new ProxyService()
  private nameVariantsService = new NameVariantService()
  private nameMatcherService = new NameMatcherService()
  private faceMatchesService = new FaceMatchesService()
  private webImageProcessorService = new WebImageProcessorService()

  async runWorker(
    workerId: number,
    {
      browser,
      name,
      websites,
      results,
      options,
    }: {
      browser: Browser
      name: PartialSearchedName
      websites: WebsiteConfig[]
      results: TextMatchResult[]
      options: SearchOptions
    },
  ): Promise<void> {
    for (let i = workerId; i < websites.length; i += options.maxConcurrent || 3) {
      const site = websites[i]
      for (const route of site.routes) {
        await this.processRoute({ browser, site, route, name, results, options })
      }
    }
  }

  private async processRoute({
    browser,
    site,
    route,
    name,
    results,
    options,
  }: {
    browser: Browser
    site: WebsiteConfig
    route: string
    name: PartialSearchedName
    results: TextMatchResult[]
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

      await this.checkNameMatchOnPage({ page, name, site, url, results })
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
    name: PartialSearchedName
    site: WebsiteConfig
    url: string
    results: TextMatchResult[]
  }): Promise<void> {
    const variants = this.nameVariantsService.generateUkrainianNameVariants(name.firstName, name.lastName)
    const found = await this.nameMatcherService.checkNameOnPage(page, variants, site.nameSelectors)

    if (found.matches.length > 0) {
      results.push({
        link: url,
        text: found.excerpt || '',
      })
    }
  }

  async searchSite(site: WebsiteForSearch, inputDescriptor: any): Promise<FaceMatcherResult[]> {
    const siteMatches: FaceMatcherResult[] = []
    let scrapedSoFar = 0
    let routeIndex = 0

    while (scrapedSoFar < MAX_IMAGES && routeIndex < site.routes.length) {
      const imagesForSearch = await this.webImageProcessorService.scrapeImagesFromRoute(site, routeIndex)
      const matches = await this.faceMatchesService.findFaceMatches(inputDescriptor, imagesForSearch, MIN_SIMILARITY)
      siteMatches.push(...matches)

      scrapedSoFar += imagesForSearch.length
      routeIndex++
    }

    return siteMatches
  }
}
