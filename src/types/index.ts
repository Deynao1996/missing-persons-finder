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

interface WebsiteConfig {
  baseUrl: string
  routes: string[]
  nameSelectors?: string[]
}

export interface BulkAcrossWebsites {
  names: { firstName: string; lastName: string }[]
  websites: WebsiteConfig[]
  options: {
    maxConcurrent?: number
    timeout?: number
    proxyRotate?: boolean
  }
}
