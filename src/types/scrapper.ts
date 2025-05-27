type Dimensions = { width: number; height: number }

interface ScrapedImageMeta {
  width: number
  height: number
  altText: string
}

export interface ScrapedImage {
  url: string
  imageUrl: string
  timestamp: string
  buffer: Buffer
  route: string
  metadata: ScrapedImageMeta
}

export interface ScrapeOptions {
  outputDir?: string
  maxImages?: number
  batchSize?: number
  minDimensions?: Dimensions
  backgroundSelectors?: string[]
}

export interface ScrapLargeVolume {
  baseUrl: string
  options?: ScrapeOptions
  routes: string[]
}
