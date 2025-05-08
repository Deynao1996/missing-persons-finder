import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export class TelegramImageProcessorService {
  async processTelegramImage(
    inputPath: string,
    options: {
      outputDir?: string
      targetFormat?: 'jpeg' | 'webp'
      quality?: number
      width?: number
      height?: number
    } = {},
  ): Promise<{ processedPath: string; originalFormat: string }> {
    try {
      const buffer = fs.readFileSync(inputPath)

      const image = sharp(buffer)
      const metadata = await image.metadata()
      const originalFormat = metadata.format || 'jpeg'
      const outputFormat = options.targetFormat || 'jpeg'

      const resized = image.resize(options.width || 800, options.height || 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })

      const ext = `.${outputFormat}`
      const fileBase = path.basename(inputPath, path.extname(inputPath))
      const outputDir = options.outputDir || path.dirname(inputPath)
      const processedPath = path.join(outputDir, `${fileBase}${ext}`)

      // Convert & save
      await (
        outputFormat === 'webp'
          ? resized.webp({ quality: options.quality || 85 })
          : resized.jpeg({ quality: options.quality || 90 })
      ).toFile(processedPath)

      // Optionally delete the original if different
      if (path.extname(inputPath) !== ext) fs.unlinkSync(inputPath)

      return {
        processedPath,
        originalFormat,
      }
    } catch (err) {
      console.error(`❌ Failed to process image ${inputPath}:`, err)
      throw err
    }
  }
}
