import path from 'path'
import { Page } from 'puppeteer'
import sharp from 'sharp'
import { ExtractedImage } from './types'

export class WebImageProcessorService {
  async downloadAndProcessImage(
    url: string,
    outputPath: string,
    options: {
      targetFormat?: 'webp' | 'jpeg'
      quality?: number
      width?: number
      height?: number
    } = {},
  ): Promise<{ processedPath: string; originalFormat: string }> {
    try {
      // 1. Download the image
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      const buffer = await response.arrayBuffer()

      // 2. Determine original format
      const image = sharp(Buffer.from(buffer))
      const metadata = await image.metadata()
      const originalFormat = metadata.format || 'jpeg'
      const outputFormat = options.targetFormat || originalFormat

      // 3. Process with sharp
      const sharpInstance = sharp(Buffer.from(buffer)).resize(options.width || 800, options.height || 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })

      // 4. Convert if needed and save
      let processedPath = outputPath
      if (path.extname(outputPath) !== `.${outputFormat}`) {
        processedPath = outputPath.replace(/\.[^.]+$/, `.${outputFormat}`)
      }

      await (
        outputFormat === 'webp'
          ? sharpInstance.webp({ quality: options.quality || 85 })
          : sharpInstance.jpeg({ quality: options.quality || 90 })
      ).toFile(processedPath)

      return {
        processedPath,
        originalFormat,
      }
    } catch (error) {
      console.error(`Error processing ${url}:`, error)
      throw error
    }
  }

  async extractImagesFromPage(page: Page, backgroundSelectors?: string[]) {
    const imageElements = await page.$$eval('img', (imgs) =>
      imgs.map((img) => ({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })),
    )

    const backgroundElements = backgroundSelectors?.length
      ? await page.$$eval(backgroundSelectors.join(', '), (elements) =>
          elements
            .map((el) => {
              const style = window.getComputedStyle(el)
              const match = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/i)
              return match
                ? {
                    src: match[1],
                    alt: '',
                    width: el.clientWidth,
                    height: el.clientHeight,
                  }
                : null
            })
            .filter((el): el is { src: string; alt: string; width: number; height: number } => el !== null),
        )
      : []

    const combined = [...imageElements, ...backgroundElements]
    return combined.reduce((unique: typeof imageElements, current) => {
      const isDuplicate = unique.some(
        (img) => img.src.localeCompare(current.src, undefined, { sensitivity: 'base' }) === 0,
      )
      return isDuplicate ? unique : [...unique, current]
    }, [])
  }

  async getValidImages(images: ExtractedImage[], options: any) {
    return images
      .filter(
        (img) =>
          img.src &&
          img.width >= (options.minDimensions?.width || 200) &&
          img.height >= (options.minDimensions?.height || 200) &&
          !img.src.match(/logo|icon|button|spinner|svg/i),
      )
      .slice(0, options.maxImages || 100)
  }
}
