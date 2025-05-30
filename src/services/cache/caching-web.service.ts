import puppeteer, { Page } from 'puppeteer'
import fs from 'fs/promises'
import { appendToNDJSON, readNDJSON } from '../../utils/ndjson.util'
import { WEB_CACHE_DIR, WEB_CACHE_FILE } from '../../constants'
import { TextMatchResult } from '../../types'

export class CachingWebService {
  async createFullCache(): Promise<void> {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await this.setupPage(page)

    await this.ensureDirectoryExists(WEB_CACHE_DIR)

    const allItems: TextMatchResult[] = []

    let currentPage = 1
    let hasNextPage = true

    while (hasNextPage) {
      const url =
        currentPage === 1 ? `${process.env.SOURCE_BASE_URL!}/` : `${process.env.SOURCE_BASE_URL!}/page/${currentPage}`

      console.log(`🔎 Scraping page ${currentPage}: ${url}`)

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })

        const cards = await page.$$eval('h3.simple-grid-grid-post-title > a', (elements) =>
          elements.map((el) => ({
            text: el.textContent?.trim() || '',
            link: (el as HTMLAnchorElement).href || '',
          })),
        )

        if (cards.length === 0) {
          hasNextPage = false
          console.log('🚫 No more cards found. Stopping.')
        } else {
          const date = this.formatDate()
          allItems.push(...cards.map((card) => ({ ...card, date })))
          currentPage++
        }
      } catch (error) {
        console.warn(`⚠️ Failed to scrape page ${currentPage}`, error)
        hasNextPage = false
      }
    }

    await browser.close()

    // Write all entries as NDJSON
    await fs.writeFile(WEB_CACHE_FILE, allItems.map((item) => JSON.stringify(item)).join('\n') + '\n')
    console.log(`✅ Full cache saved to ${WEB_CACHE_FILE}`)
  }

  async updateCacheIfNew(): Promise<{ newItems: number }> {
    const existing = await readNDJSON(WEB_CACHE_FILE)
    const existingTitles = new Set(existing.map((item) => item.text))

    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await this.setupPage(page)

    const newEntries: TextMatchResult[] = []

    let currentPage = 1
    let hasNextPage = true

    while (hasNextPage) {
      const url =
        currentPage === 1 ? `${process.env.SOURCE_BASE_URL!}/` : `${process.env.SOURCE_BASE_URL!}/page/${currentPage}`

      console.log(`🔄 Checking page ${currentPage}: ${url}`)

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })

        const cards = await page.$$eval('h3.simple-grid-grid-post-title > a', (elements) =>
          elements.map((el) => ({
            text: el.textContent?.trim() || '',
            link: (el as HTMLAnchorElement).href || '',
          })),
        )

        if (cards.length === 0) {
          hasNextPage = false
          console.log('🚫 No cards found. Stopping.')
          break
        }

        for (const card of cards) {
          if (existingTitles.has(card.text)) {
            console.log(`🛑 Found existing card: "${card.text}". Stopping.`)
            hasNextPage = false
            break
          }

          newEntries.push({ ...card, date: this.formatDate() })
        }

        currentPage++
      } catch (error) {
        console.warn(`⚠️ Failed to check page ${currentPage}`, error)
        hasNextPage = false
      }
    }

    await browser.close()

    if (newEntries.length > 0) {
      await appendToNDJSON(newEntries, WEB_CACHE_FILE)
      console.log(`✅ Added ${newEntries.length} new items to cache.`)
    } else {
      console.log('ℹ️ No new items found.')
    }

    return { newItems: newEntries.length }
  }

  private async setupPage(page: Page): Promise<void> {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    )
    try {
      await page.goto(process.env.SOURCE_BASE_URL!, { waitUntil: 'networkidle2' })
    } catch (error) {
      console.warn('Initial load failed, retrying with cache...')
      await page.goto(process.env.SOURCE_BASE_URL!, {
        waitUntil: 'networkidle2',
        timeout: 15000,
      })
    }
  }

  private async ensureDirectoryExists(dir: string) {
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (e) {
      console.error('Failed to create directory:', dir)
    }
  }

  private formatDate(): string {
    return new Date().toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
}
