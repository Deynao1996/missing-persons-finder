import { Browser, Page } from 'puppeteer'

export interface SearchedName {
  firstName: string
  lastName: string
  patronymic?: string
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
  meta: string
  sourceImageUrl: string
  textMessage?: string
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

export interface NameMatchResult {
  matches: string[]
  excerpt?: string
}

export interface NameVariantOptions {
  includeFemaleForms?: boolean
  includeInitials?: boolean
  includeReversed?: boolean
}

export interface SearchResultsLog {
  searchedMessages: number[]
  reviewedMessages: number[]
  unreviewedMessages: number[]
}

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

export interface ChannelTextMatchResults {
  [channel: string]: TextMatchResult[]
}

export interface ChannelFaceMatchResults {
  [channel: string]: FaceMatcherResult[]
}
