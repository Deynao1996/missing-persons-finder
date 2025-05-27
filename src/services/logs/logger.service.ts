import fs from 'fs/promises'
import path from 'path'
import { SearchHistory, SearchResultsLog } from '../../types'

export class LoggerService {
  private historyPath = path.join('data', 'telegram_cache', 'search_history.json')
  private logPath = path.join('data', 'telegram_cache', 'search_results.json')

  async loadChannelLog(): Promise<SearchResultsLog> {
    try {
      const raw = await fs.readFile(this.logPath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return {
        searchedMessages: {},
        reviewedMessages: {},
        unreviewedMessages: {},
      }
    }
  }

  private async saveChannelLog(log: SearchResultsLog) {
    await fs.writeFile(this.logPath, JSON.stringify(log, null, 2))
  }

  private deduplicate(arr: number[]): number[] {
    return Array.from(new Set(arr)).sort((a, b) => a - b)
  }

  async saveSearchResultsLog<T extends { sourceImageUrl?: string; link?: string }>(
    queryId: string,
    results: Record<string, T[]>,
    extractMessageId: (result: T) => number | null,
  ) {
    const log = await this.loadChannelLog()

    for (const [channel, matches] of Object.entries(results)) {
      const newIds = matches.map((m) => extractMessageId(m)).filter((id): id is number => id !== null)

      if (!log.searchedMessages[queryId]) log.searchedMessages[queryId] = {}
      if (!log.reviewedMessages[queryId]) log.reviewedMessages[queryId] = {}
      if (!log.unreviewedMessages[queryId]) log.unreviewedMessages[queryId] = {}

      const searched = log.searchedMessages[queryId][channel] || []
      const reviewed = new Set(log.reviewedMessages[queryId][channel] || [])
      const unreviewed = new Set(log.unreviewedMessages[queryId][channel] || [])

      log.searchedMessages[queryId][channel] = this.deduplicate([...searched, ...newIds])

      for (const id of newIds) {
        if (!reviewed.has(id)) {
          unreviewed.add(id)
        }
      }

      log.unreviewedMessages[queryId][channel] = this.deduplicate([...unreviewed])
    }

    await this.saveChannelLog(log)
  }

  async markMessagesAsReviewed(queryId: string, channel: string, ids: number[]) {
    const log = await this.loadChannelLog()

    if (!log.reviewedMessages[queryId]) log.reviewedMessages[queryId] = {}
    if (!log.unreviewedMessages[queryId]) log.unreviewedMessages[queryId] = {}

    const reviewedSet = new Set(log.reviewedMessages[queryId][channel] || [])
    const unreviewedSet = new Set(log.unreviewedMessages[queryId][channel] || [])

    for (const id of ids) {
      reviewedSet.add(id)
      unreviewedSet.delete(id)
    }

    log.reviewedMessages[queryId][channel] = this.deduplicate([...reviewedSet])
    log.unreviewedMessages[queryId][channel] = this.deduplicate([...unreviewedSet])

    await this.saveChannelLog(log)
  }

  async logGlobalSearchSession<T>(
    type: 'image' | 'text',
    query: string,
    results: Record<string, T[]>,
    extractMessageId: (item: T) => number | null,
  ) {
    const history = await this.readSearchHistory()

    const timestamp = new Date().toISOString()
    const channelMatches: Record<string, number[]> = {}

    for (const [channel, matches] of Object.entries(results)) {
      channelMatches[channel] = matches.map(extractMessageId).filter((id): id is number => id !== null)
    }

    history.searches.push({
      type,
      timestamp,
      query,
      channels: channelMatches,
    })

    await this.writeSearchHistory(history)
  }

  private async readSearchHistory(): Promise<SearchHistory> {
    try {
      const raw = await fs.readFile(this.historyPath, 'utf8')
      return JSON.parse(raw)
    } catch {
      return { searches: [] }
    }
  }

  private async writeSearchHistory(history: SearchHistory) {
    await this.writeJSON(this.historyPath, history)
  }

  private async writeJSON(filePath: string, data: unknown) {
    const json = JSON.stringify(data, null, 2)
    await fs.writeFile(filePath, json, 'utf8')
  }
}
