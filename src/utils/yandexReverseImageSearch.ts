import puppeteer, { Browser, Page } from 'puppeteer'

export async function searchImageOnYandex(imagePath: string): Promise<string[] | null> {
  let browser: Browser | null = null

  try {
    browser = await puppeteer.launch({ headless: false }) // Set headless: true for production
    const page: Page = await browser.newPage()

    await setupPage(page)
    await uploadImage(page, imagePath)
    await navigateToSitesTab(page)

    const links = await extractUniqueLinks(page)
    return links
  } catch (error) {
    console.error('Error during search:', error)
    return null
  } finally {
    if (browser) await browser.close()
  }
}

async function setupPage(page: Page): Promise<void> {
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  )
  await page.goto('https://yandex.com/images/', { waitUntil: 'networkidle2' })
}

async function uploadImage(page: Page, imagePath: string): Promise<void> {
  await page.waitForSelector('.input__cbir-button', { timeout: 60000, visible: true })
  await page.click('.input__cbir-button')

  const inputSelector = 'input[type=file]'
  await page.waitForSelector(inputSelector)
  const input = await page.$(inputSelector)
  if (!input) throw new Error('File input not found')

  await input.uploadFile(imagePath)
  await page.waitForNavigation({ waitUntil: 'networkidle2' })
}

async function navigateToSitesTab(page: Page): Promise<void> {
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

async function extractUniqueLinks(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const items = document.querySelectorAll('.CbirSites-Items .CbirSites-Item a')
    const uniqueLinks = new Set<string>()

    items.forEach((item) => {
      const href = item.getAttribute('href')
      if (href) uniqueLinks.add(href)
    })

    return Array.from(uniqueLinks)
  })
}
