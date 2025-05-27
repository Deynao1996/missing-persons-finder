import { Page } from 'puppeteer'

export class NameMatcherService {
  async checkNameOnPage(
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
      const excerpt = await this.extractContext(page, foundVariants[0])
      return { matches: foundVariants, excerpt }
    }

    return { matches: [] }
  }

  private async extractContext(page: Page, searchTerm: string): Promise<string> {
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
}
