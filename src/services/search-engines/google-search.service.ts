import puppeteer, { Browser, Page } from 'puppeteer'
import { delay } from '../../utils/delay.util'

export class GoogleSearchService {
  async searchImageOnGoogleLens(imagePath: string): Promise<string[] | null> {
    let browser: Browser | null = null

    try {
      browser = await puppeteer.launch({ headless: false })
      const page: Page = await browser.newPage()

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      )

      await page.goto('https://lens.google.com', { waitUntil: 'networkidle2' })

      await page.waitForSelector('div[aria-label="Search by image"]', { timeout: 60000, visible: true })
      await page.click('div[aria-label="Search by image"]')

      const inputSelector = 'input[type=file]'
      await page.waitForSelector(inputSelector)
      const input = await page.$(inputSelector)
      if (input) {
        await input.uploadFile(imagePath)
      } else {
        throw new Error('File input not found')
      }

      await page.waitForSelector('.cvP2Ce', { timeout: 60000, visible: true })
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight)
      })
      await delay(2000)

      const links = await page.evaluate(() => {
        const items = document.querySelectorAll('.cvP2Ce a')
        const links: string[] = []
        items.forEach((item) => {
          const href = item.getAttribute('href')
          if (href) {
            links.push(href)
          }
        })
        return links
      })

      return links
    } catch (error) {
      console.error('Error during search:', error)
      return null
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }
}
