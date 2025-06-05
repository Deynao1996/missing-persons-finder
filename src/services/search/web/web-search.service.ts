import { TextMatchResult } from '../../../types'
import { extractMessageId, parseSearchQuery } from '../../../utils/extract.utils'
import { NameVariantService } from '../../name-matching/name-variants.service'
import fs from 'fs/promises'
import { LoggerService } from '../../logs/logger.service'

export class WebSearchService {
  private nameVariantService = new NameVariantService()
  private loggerService = new LoggerService()

  async searchWebCache(
    query: string,
    queryId: string,
    source: string,
    webCacheFile: string,
  ): Promise<Record<string, TextMatchResult[]>> {
    const rawQueries = parseSearchQuery(query)
    const parsedNames = rawQueries.map(this.nameVariantService.parseNameQuery)

    const fileContent = await fs.readFile(webCacheFile, 'utf-8')
    const lines = fileContent.trim().split('\n')

    const log = await this.loggerService.loadChannelLog()
    const reviewedIds = new Set(log.reviewedMessages[queryId]?.[source] || [])

    const results: TextMatchResult[] = []

    for (const line of lines) {
      const entry = JSON.parse(line) as TextMatchResult
      const id = extractMessageId(entry.link)

      if (id !== null && reviewedIds.has(id as string)) {
        continue
      }

      const lowerText = entry.text.toLowerCase()
      const linkWithoutSlash = this.removeTrailingSlash(entry.link)

      for (const { firstName, lastName } of parsedNames) {
        if (!lastName) continue

        const lowerLast = lastName.toLowerCase()
        const lowerFirst = firstName?.toLowerCase()

        // Split text into words, remove punctuation
        const words = lowerText.split(/[\s,.;!?]+/)

        for (let i = 0; i < words.length; i++) {
          if (words[i] === lowerLast) {
            const nextWord = words[i + 1]
            if (!lowerFirst || !nextWord) {
              results.push({ ...entry, link: linkWithoutSlash })
              break
            }

            // Require next word to match full first name or a strict prefix
            const isExact = nextWord === lowerFirst
            const isPrefix2 = lowerFirst.length >= 2 && nextWord.startsWith(lowerFirst.slice(0, 2))
            const isPrefix3 = lowerFirst.length >= 3 && nextWord.startsWith(lowerFirst.slice(0, 3))

            if (isExact || isPrefix2 || isPrefix3) {
              results.push({ ...entry, link: linkWithoutSlash })
              break
            }
          }
        }
      }
    }
    console.log(`✅ Finished search in ${source} for "${query}"`)

    if (results.length === 0) {
      return {}
    } else {
      return {
        [source]: results,
      }
    }
  }

  private removeTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url
  }
}
