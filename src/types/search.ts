import { WebsiteConfig } from './web'

type ChannelsType = Record<string, number[]>

export interface SearchedName {
  firstName: string
  lastName: string
  patronymic?: string
}

type QueryId = string

export interface SearchOptions {
  maxConcurrent?: number
  timeout?: number
  proxyRotate?: boolean
}

export interface BulkAcrossWebsites {
  name: PartialSearchedName
  websites: WebsiteConfig[]
  options: SearchOptions
}

interface BulkResult {
  website: string
  url: string
  found: boolean
  matches: string[]
  excerpt?: string
}

export interface BulkSearchResult {
  name: string
  results: BulkResult[]
}

export interface GlobalLogSearches {
  timestamp: string
  inputImagePath: string
  channels: ChannelsType
}

export interface TextLogSearches {
  timestamp: string
  type: 'image' | 'text'
  inputImagePath?: string
  query?: string
  channels: ChannelsType
}

export interface SearchResultsLog {
  searchedMessages: Record<QueryId, Record<string, number[]>>
  reviewedMessages: Record<QueryId, Record<string, number[]>>
  unreviewedMessages: Record<QueryId, Record<string, number[]>>
}

type GlobalSearchSession =
  | {
      type: 'image'
      timestamp: string
      query: string // file path
      channels: Record<string, number[]>
    }
  | {
      type: 'text'
      timestamp: string
      query: string // text string
      channels: Record<string, number[]>
    }

export type SearchHistory = { searches: GlobalSearchSession[] }

export type PartialSearchedName = Partial<SearchedName>
