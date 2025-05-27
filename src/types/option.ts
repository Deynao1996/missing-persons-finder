import { Browser, Page } from 'puppeteer'
import { PartialSearchedName, SearchOptions } from './search'
import { WebsiteConfig } from './web'
import { TextMatchResult } from './result'

type TargetImageFormat = 'jpeg' | 'webp'

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

export interface NameVariantOptions {
  includeInitials?: boolean
  includeReversed?: boolean
}

export interface ImageProcessOptions {
  targetFormat?: TargetImageFormat
  quality?: number
  width?: number
  height?: number
}
