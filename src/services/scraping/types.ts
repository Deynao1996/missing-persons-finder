export interface SearchedNames {
  firstName: string
  lastName: string
}

export interface SearchOptions {
  maxConcurrent?: number
  timeout?: number
  proxyRotate?: boolean
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

export interface WebsiteForSearch {
  baseUrl: string
  routes: string[]
  backgroundSelectors?: string[]
}

export interface FaceMatcherResult {
  similarity: number
  position: { x: number; y: number; width: number; height: number }
  meta: string
  sourceImageUrl: string
}
