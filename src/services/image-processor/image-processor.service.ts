import sharp from 'sharp'
import { ImageProcessOptions } from './types'

export class ImageProcessorService {
  async processImageBuffer(buffer: Buffer, options: ImageProcessOptions = {}): Promise<Buffer> {
    const image = sharp(buffer)
    const outputFormat = options.targetFormat || 'jpeg'
    const resized = image.resize(options.width || 800, options.height || 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })

    return outputFormat === 'webp'
      ? await resized.webp({ quality: options.quality || 85 }).toBuffer()
      : await resized.jpeg({ quality: options.quality || 90 }).toBuffer()
  }
}
