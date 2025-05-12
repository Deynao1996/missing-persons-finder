import { NameVariantOptions } from './types'

export class NameVariantService {
  generateUkrainianNameVariants(firstName?: string, lastName?: string, options: NameVariantOptions = {}): string[] {
    const variants: string[] = []

    if (firstName && lastName) {
      variants.push(`${firstName} ${lastName}`.toLowerCase(), `${lastName} ${firstName}`.toLowerCase())

      if (options.includeInitials ?? true) {
        variants.push(`${firstName.charAt(0)}. ${lastName}`.toLowerCase())
      }

      if ((options.includeFemaleForms ?? true) && lastName.endsWith('ко')) {
        variants.push(`${firstName} ${lastName.replace('ко', 'ка')}`.toLowerCase())
      }

      if (options.includeReversed ?? false) {
        variants.push(`${lastName}, ${firstName}`.toLowerCase())
      }
    } else if (lastName) {
      variants.push(lastName.toLowerCase())
      if ((options.includeFemaleForms ?? true) && lastName.endsWith('ко')) {
        variants.push(lastName.replace('ко', 'ка').toLowerCase())
      }
    } else if (firstName) {
      variants.push(firstName.toLowerCase())
    }

    return variants
  }

  parseNameQuery(query: string): { firstName?: string; lastName?: string } {
    const parts = query.trim().split(/\s+/)
    if (parts.length === 1) {
      return { lastName: parts[0] }
    } else if (parts.length === 2) {
      return { lastName: parts[0], firstName: parts[1] }
    } else {
      throw new Error('Query should contain 1 or 2 words (e.g., "Shevchenko" or "Shevchenko Taras")')
    }
  }
}
