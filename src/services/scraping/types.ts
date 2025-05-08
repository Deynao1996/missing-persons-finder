export interface SearchedNames {
  firstName: string
  lastName: string
}

export interface SearchOptions {
  maxConcurrent?: number
  timeout?: number
  proxyRotate?: boolean
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

export interface WebsiteConfig {
  baseUrl: string
  routes: string[]
  nameSelectors?: string[]
}

export interface BulkAcrossWebsites {
  names: SearchedNames[]
  websites: WebsiteConfig[]
  options: SearchOptions
}

export interface BulkSearchResult {
  name: string
  results: {
    website: string
    url: string
    found: boolean
    matches: string[]
    excerpt?: string
  }[]
}

export interface ExtractedImage {
  src: string
  width: number
  height: number
  alt: string
}

export interface TelegramMatch {
  text: string
  date: string
  link: string
}
