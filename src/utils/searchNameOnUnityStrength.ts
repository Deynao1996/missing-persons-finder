import puppeteer, { Page } from 'puppeteer'
import { BulkAcrossWebsites, BulkSearchResult } from '../types'

export async function bulkSearchAcrossWebsites({
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', ...(options.proxyRotate ? [getCurrentProxy()] : [])],
  })

  const workerPool = Array(options.maxConcurrent || 3).fill(null)

  await Promise.all(
    workerPool.map(async (_, workerId) => {
      for (let i = workerId; i < websites.length; i += workerPool.length) {
        const { baseUrl, routes, nameSelectors } = websites[i]

        for (const route of routes) {
          const page = await browser.newPage()
          const url = route.startsWith('http') ? route : `${baseUrl}${route}`

          try {
            // Configure Ukrainian context
            await page.setExtraHTTPHeaders({
              'Accept-Language': 'uk-UA,uk;q=0.9',
              'X-Forwarded-For': generateUkrainianIP(),
            })

            await page.goto(url, {
              waitUntil: 'domcontentloaded',
              timeout: options.timeout || 20000,
            })

            // Wait for dynamic content if selectors exist
            if (nameSelectors) {
              await Promise.race([
                Promise.all(nameSelectors.map((sel) => page.waitForSelector(sel, { timeout: 5000 }))),
                delay(3000), // Fallback timeout
              ])
            }

            // Search all names on this page
            for (const { firstName, lastName } of names) {
              const variants = generateUkrainianNameVariants(firstName, lastName)
              const found = await checkNameOnPage(page, variants, nameSelectors)

              if (found.matches.length > 0) {
                const nameStr = `${firstName} ${lastName}`
                const result = results.find((r) => r.name === nameStr)

                result?.results.push({
                  website: new URL(baseUrl).hostname,
                  url,
                  found: true,
                  ...found,
                })
              }
            }
          } catch (error) {
            console.error(`Error searching ${url}:`, error)
          } finally {
            await page.close()
            await delay(2000 + Math.random() * 3000) // Wartime delay
          }
        }
      }
    }),
  )

  await browser.close()
  return results
}

// Helper functions
async function checkNameOnPage(
  page: Page,
  nameVariants: string[],
  customSelectors?: string[],
): Promise<{ matches: string[]; excerpt?: string }> {
  // Method 1: Check custom selectors first
  if (customSelectors) {
    for (const selector of customSelectors) {
      const elements = await page.$$(selector)
      for (const el of elements) {
        const text = await page.evaluate((e) => e.textContent?.toLowerCase() || '', el)
        const foundVariants = nameVariants.filter((v) => text.includes(v))
        if (foundVariants.length > 0) {
          return {
            matches: foundVariants,
            excerpt: text.trim().substring(0, 200),
          }
        }
      }
    }
  }

  // Method 2: Fallback to full-text search
  const content = await page.evaluate(() => document.body.innerText.toLowerCase())
  const foundVariants = nameVariants.filter((v) => content.includes(v))

  if (foundVariants.length > 0) {
    const excerpt = await extractContext(page, foundVariants[0])
    return { matches: foundVariants, excerpt }
  }

  return { matches: [] }
}

function generateUkrainianNameVariants(firstName: string, lastName: string): string[] {
  return [
    `${firstName} ${lastName}`.toLowerCase(),
    `${lastName} ${firstName}`.toLowerCase(),
    `${firstName.charAt(0)}. ${lastName}`.toLowerCase(),
    ...(lastName.endsWith('ко')
      ? [
          `${firstName} ${lastName.replace('ко', 'ка')}`.toLowerCase(), // Female version
        ]
      : []),
  ]
}

function extractContext(page: Page, searchTerm: string): Promise<string> {
  return page.evaluate((term) => {
    const textNode = document.evaluate(
      `//text()[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${term}')]`,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue
    return textNode?.textContent?.trim().substring(0, 200) || ''
  }, searchTerm)
}

function getCurrentProxy(): string {
  const proxies = ['socks5://kyiv1.proxy:1080', 'socks5://lviv.proxy:1080', 'socks5://backup.proxy:1080']
  return proxies[Math.floor(Math.random() * proxies.length)]
}

function generateUkrainianIP(): string {
  const prefixes = ['31.128', '37.73', '46.175']
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}.${Math.floor(Math.random() * 255)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
