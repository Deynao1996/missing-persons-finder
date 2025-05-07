export interface NameMatchResult {
  matches: string[]
  excerpt?: string
}

export interface NameVariantOptions {
  includeFemaleForms?: boolean
  includeInitials?: boolean
  includeReversed?: boolean
}
