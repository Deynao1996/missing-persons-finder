export interface WebsiteConfig {
  baseUrl: string
  routes: string[]
  nameSelectors?: string[]
}

export interface WebsiteForSearch {
  baseUrl: string
  routes: string[]
  backgroundSelectors?: string[]
}
