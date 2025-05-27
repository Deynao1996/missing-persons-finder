export class NameVariantService {
  generateUkrainianNameVariants(firstName?: string, lastName?: string): string[] {
    if (firstName && lastName) {
      return [`${lastName} ${firstName}`.toLowerCase(), `${firstName} ${lastName}`.toLowerCase()]
    }
    return []
  }

  parseNameQuery(query: string): { firstName?: string; lastName?: string } {
    const parts = query.trim().split(/\s+/)

    if (parts.length === 1) {
      return { lastName: parts[0] }
    } else if (parts.length === 2) {
      return { lastName: parts[0], firstName: parts[1] }
    } else {
      return {}
    }
  }
}
