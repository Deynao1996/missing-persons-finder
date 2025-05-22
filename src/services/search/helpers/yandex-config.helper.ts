import { Page } from 'puppeteer'

export class YandexConfigHelper {
  async setupPage(page: Page): Promise<void> {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    )
    try {
      await page.goto('https://yandex.ru/images/', { waitUntil: 'networkidle2' })
    } catch (error) {
      console.warn('Initial load failed, retrying with cache...')
      await page.goto('https://yandex.ru/images/', {
        waitUntil: 'networkidle2',
        timeout: 15000,
      })
    }
  }

  async uploadImage(page: Page, imagePath: string): Promise<void> {
    await page.waitForSelector('.HeaderForm-InlineCbirButton', { timeout: 60000, visible: true })
    await page.click('.HeaderForm-InlineCbirButton')

    const inputSelector = 'input[type=file]'
    await page.waitForSelector(inputSelector)
    const input = await page.$(inputSelector)
    if (!input) throw new Error('File input not found')

    await input.uploadFile(imagePath)
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
  }

  async navigateToSitesTab(page: Page): Promise<void> {
    await page.waitForSelector('.CbirNavigation-TabsMenu', { timeout: 60000, visible: true })

    const clicked = await page.evaluate(() => {
      const links = document.querySelectorAll('.CbirNavigation-TabsMenu a')
      if (links.length === 0) return false

      const lastLink = links[links.length - 1] as HTMLAnchorElement
      lastLink.click()
      return true
    })

    if (!clicked) throw new Error('No links found in .CbirNavigation-TabsMenu')

    await page.waitForSelector('.CbirSites-Items', { timeout: 60000, visible: true })
  }

  async extractUniqueLinks(page: Page): Promise<string[]> {
    try {
      return await page.evaluate(() => {
        // 1. More resilient selector that accounts for Yandex's DOM variations
        const linkElements = Array.from(
          document.querySelectorAll('.CbirSites-Item a, .Link[href^="http"]'),
        ) as HTMLAnchorElement[]

        // 2. Filter and normalize links
        const links = new Set<string>()
        const yandexDomains = ['yandex.ru', 'yandex.ua', 'yandex.com']

        linkElements.forEach((element) => {
          try {
            let href = element.href

            // Skip Yandex internal links
            if (yandexDomains.some((domain) => href.includes(domain))) {
              return
            }

            // Normalize URL (remove tracking parameters)
            const url = new URL(href)
            url.searchParams.forEach((_, key) => {
              if (key.startsWith('utm_') || key === 'yclid') {
                url.searchParams.delete(key)
              }
            })

            // Add clean URL
            links.add(url.toString())
          } catch (e) {
            console.warn('Invalid URL:', element.href)
          }
        })

        // 3. Prioritize certain domains
        return Array.from(links).sort((a, b) => {
          const priorityDomains = ['facebook', 'vk.com', 'forum', 'news']
          const aPriority = priorityDomains.some((d) => a.includes(d)) ? 1 : 0
          const bPriority = priorityDomains.some((d) => b.includes(d)) ? 1 : 0
          return bPriority - aPriority
        })
      })
    } catch (error) {
      console.error('Link extraction failed:', error)

      // Fallback: Try alternative selectors
      const fallbackLinks = await page.$$eval('a[href]', (anchors) => anchors.map((a) => a.href).filter(Boolean))

      return Array.from(new Set(fallbackLinks))
        .filter((link) => !link.includes('yandex'))
        .slice(0, 20) // Limit results
    }
  }
}
