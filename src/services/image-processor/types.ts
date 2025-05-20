export interface ExtractedImage {
  src: string
  width: number
  height: number
  alt: string
}

export interface BatchedImage {
  imageBuffer: Buffer
  meta: {
    msgId: number
    faceIndex: number
    msgDate: Date
    sourceImageUrl: string
  }
  descriptor: number[]
}

export interface ScrapedImage {
  url: string
  imageUrl: string
  timestamp: string
  buffer: Buffer
  route: string
  metadata: {
    width: number
    height: number
    altText: string
  }
}

export interface ScrapeOptions {
  outputDir?: string
  maxImages?: number
  batchSize?: number
  minDimensions?: { width: number; height: number }
  backgroundSelectors?: string[]
}

export interface ScrapLargeVolume {
  baseUrl: string
  options?: ScrapeOptions
  routes: string[]
}

export interface ImageProcessOptions {
  targetFormat?: 'jpeg' | 'webp'
  quality?: number
  width?: number
  height?: number
}
