import { TextMatchResult } from './result'

export interface CacheUpdateResponse {
  success: boolean
  updated: Record<string, number>
}

export interface PersonResult {
  fullName: string
  id: string
  results: { [source: string]: TextMatchResult[] }
}

export interface QueryResponse {
  totalPersons: number
  page: number
  pageSize: number
  hasMore: boolean
  results: PersonResult[]
}
