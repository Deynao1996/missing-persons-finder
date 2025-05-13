import { Browser, Page } from 'puppeteer'

export interface SearchedName {
  firstName: string
  lastName: string
}

export type PartialSearchedName = Partial<SearchedName>

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
  name: PartialSearchedName
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

export interface TextMatchResult {
  text: string
  date?: string
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

export interface TelegramSearchConfig {
  maxImages: number
  batchSize: number
  channelUsername: string
  minDate: Date
  delayMs: number
}

export interface WorkerOptions {
  browser: Browser
  name: PartialSearchedName
  websites: WebsiteConfig[]
  results: TextMatchResult[]
  options: SearchOptions
}

export interface RouteOptions {
  browser: Browser
  site: WebsiteConfig
  route: string
  name: PartialSearchedName
  results: TextMatchResult[]
  options: SearchOptions
}

export interface PageMatcherOptions {
  page: Page
  name: PartialSearchedName
  site: WebsiteConfig
  url: string
  results: TextMatchResult[]
}

export interface FetchedImageBatchOptions {
  channelUsername: string
  batchSize?: number
  minDate?: Date
  offsetId?: number
}
