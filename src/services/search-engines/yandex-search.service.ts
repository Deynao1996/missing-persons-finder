import puppeteer, { Browser, Page } from 'puppeteer'
import { YandexHelpersStrategy } from './stratagies/yandex-helpers.strategy'

export class YandexSearchService {
  private strategy: YandexHelpersStrategy

  constructor() {
    this.strategy = new YandexHelpersStrategy()
  }

  async searchImageOnYandex(imagePath: string): Promise<string[] | null> {
    let browser: Browser | null = null

    try {
      browser = await puppeteer.launch({ headless: false }) // Set headless: true for production
      const page: Page = await browser.newPage()

      await this.strategy.setupPage(page)
      await this.strategy.uploadImage(page, imagePath)
      await this.strategy.navigateToSitesTab(page)

      const links = await this.strategy.extractUniqueLinks(page)
      return links
    } catch (error) {
      console.error('Error during search:', error)
      return null
    } finally {
      if (browser) await browser.close()
    }
  }
}
