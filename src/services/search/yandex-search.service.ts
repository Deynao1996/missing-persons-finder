import puppeteer, { Browser, Page } from 'puppeteer'
import { YandexConfigHelper } from './helpers/yandex-config.helper'

export class YandexSearchService {
  private strategy: YandexConfigHelper

  constructor() {
    this.strategy = new YandexConfigHelper()
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
