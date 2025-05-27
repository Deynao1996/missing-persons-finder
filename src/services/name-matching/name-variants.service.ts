import { NameVariantOptions } from '../../types'

export class NameVariantService {
  generateUkrainianNameVariants(
    firstName?: string,
    lastName?: string,
    patronymic?: string,
    options: NameVariantOptions = {},
  ): string[] {
    const variants: string[] = []

    if (lastName && firstName && patronymic) {
      variants.push(
        `${lastName} ${firstName} ${patronymic}`.toLowerCase(),
        `${firstName} ${lastName} ${patronymic}`.toLowerCase(),
      )
    }

    if (lastName && firstName) {
      variants.push(`${lastName} ${firstName}`.toLowerCase(), `${firstName} ${lastName}`.toLowerCase())

      // if (options.includeInitials ?? true) {
      //   variants.push(`${firstName.charAt(0)}. ${lastName}`.toLowerCase())
      // }

      if (options.includeReversed ?? false) {
        variants.push(`${lastName}, ${firstName}`.toLowerCase())
      }
    }

    if (lastName && !firstName) {
      variants.push(lastName.toLowerCase())
    }

    if (firstName && !lastName) {
      variants.push(firstName.toLowerCase())
    }

    return variants
  }

  parseNameQuery(query: string): { firstName?: string; lastName?: string; patronymic?: string } {
    const parts = query.trim().split(/\s+/)

    if (parts.length === 1) {
      return { lastName: parts[0] }
    } else if (parts.length === 2) {
      return { lastName: parts[0], firstName: parts[1] }
    } else if (parts.length >= 3) {
      return { lastName: parts[0], firstName: parts[1], patronymic: parts[2] }
    } else {
      return {}
    }
  }
}
