import { NameVariantOptions } from './types'

export class NameVariantService {
  generateUkrainianNameVariants(firstName: string, lastName: string, options: NameVariantOptions = {}): string[] {
    const variants = [`${firstName} ${lastName}`.toLowerCase(), `${lastName} ${firstName}`.toLowerCase()]

    if (options.includeInitials ?? true) {
      variants.push(`${firstName.charAt(0)}. ${lastName}`.toLowerCase())
    }

    if ((options.includeFemaleForms ?? true) && lastName.endsWith('ко')) {
      variants.push(`${firstName} ${lastName.replace('ко', 'ка')}`.toLowerCase())
    }

    if (options.includeReversed ?? false) {
      variants.push(`${lastName}, ${firstName}`.toLowerCase())
    }

    return variants
  }
}
