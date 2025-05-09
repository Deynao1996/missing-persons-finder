export interface ExtractedImage {
  src: string
  width: number
  height: number
  alt: string
}

export interface ScrapedImage {
  url: string
  imageUrl: string
  filepath: string
  timestamp: string
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
