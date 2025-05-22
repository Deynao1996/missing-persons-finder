import path from 'path'
import { TELEGRAM_CACHE_DIR } from '../../constants'
import fs from 'fs/promises'
import { extractMessageId } from '../../utils/extract.utils'
import { ChannelFaceMatchResults, ChannelTextMatchResults, SearchResultsLog } from '../types'

export class LoggerService {
  async saveSearchResultsLog(results: ChannelFaceMatchResults) {
    for (const [channel, matches] of Object.entries(results)) {
      const logPath = path.join(TELEGRAM_CACHE_DIR, channel, 'search_results.json')

      // Default log structure
      let log: SearchResultsLog = {
        searchedMessages: [],
        reviewedMessages: [],
        unreviewedMessages: [],
      }

      // Try reading existing log file if it exists
      try {
        const data = await fs.readFile(logPath, 'utf-8')
        log = JSON.parse(data)
      } catch (e) {
        // File might not exist yet — that's OK
      }

      // Convert existing arrays to sets for efficient duplicate checking
      const searched = new Set<number>(log.searchedMessages)
      const reviewed = new Set<number>(log.reviewedMessages)
      const unreviewed = new Set<number>(log.unreviewedMessages)

      for (const match of matches) {
        const messageId = extractMessageId(match.sourceImageUrl)
        if (messageId === null) continue

        searched.add(messageId)

        // Add to unreviewed only if not already reviewed or unreviewed
        if (!reviewed.has(messageId) && !unreviewed.has(messageId)) {
          unreviewed.add(messageId)
        }
      }

      // Save updated log back to file
      const updatedLog: SearchResultsLog = {
        searchedMessages: Array.from(searched),
        reviewedMessages: Array.from(reviewed),
        unreviewedMessages: Array.from(unreviewed),
      }

      await fs.writeFile(logPath, JSON.stringify(updatedLog, null, 2), 'utf-8')
    }
  }

  async logGlobalSearchSession(imagePath: string, results: ChannelFaceMatchResults) {
    const logPath = path.join(TELEGRAM_CACHE_DIR, 'search_history.json')

    let globalLog: {
      searches: {
        timestamp: string
        inputImagePath: string
        channels: Record<string, number[]>
      }[]
    } = { searches: [] }

    try {
      const data = await fs.readFile(logPath, 'utf-8')
      globalLog = JSON.parse(data)
    } catch (e) {
      // File might not exist yet
    }

    const channels: Record<string, number[]> = {}
    for (const [channel, matches] of Object.entries(results)) {
      const ids = matches.map((m) => extractMessageId(m.sourceImageUrl)).filter(Boolean) as number[]
      channels[channel] = ids
    }

    globalLog.searches.push({
      timestamp: new Date().toISOString(),
      inputImagePath: imagePath,
      channels,
    })

    await fs.writeFile(logPath, JSON.stringify(globalLog, null, 2), 'utf-8')
  }

  async markMessagesAsReviewed(channel: string, messageIds: number[]) {
    const logPath = path.join(TELEGRAM_CACHE_DIR, channel, 'search_results.json')

    let log: SearchResultsLog = {
      searchedMessages: [],
      reviewedMessages: [],
      unreviewedMessages: [],
    }

    try {
      const data = await fs.readFile(logPath, 'utf-8')
      log = JSON.parse(data)
    } catch (e) {
      // OK if not exists
    }

    const reviewedSet = new Set(log.reviewedMessages)
    const unreviewedSet = new Set(log.unreviewedMessages)

    for (const id of messageIds) {
      reviewedSet.add(id)
      unreviewedSet.delete(id)
    }

    log.reviewedMessages = Array.from(reviewedSet)
    log.unreviewedMessages = Array.from(unreviewedSet)

    await fs.writeFile(logPath, JSON.stringify(log, null, 2), 'utf-8')
  }

  async logTextSearchSession(query: string, results: ChannelTextMatchResults) {
    const logPath = path.join(TELEGRAM_CACHE_DIR, 'search_history.json')

    let globalLog: {
      searches: {
        timestamp: string
        type: 'image' | 'text'
        inputImagePath?: string
        query?: string
        channels: Record<string, number[]>
      }[]
    } = { searches: [] }

    try {
      const data = await fs.readFile(logPath, 'utf-8')
      globalLog = JSON.parse(data)
    } catch {
      // It's okay if file doesn't exist yet
    }

    const channels: Record<string, number[]> = {}

    for (const [channel, matches] of Object.entries(results)) {
      const ids = matches.map((m) => extractMessageId(m.link)).filter((id): id is number => id !== null)

      if (ids.length > 0) {
        channels[channel] = ids
      }
    }

    globalLog.searches.push({
      timestamp: new Date().toISOString(),
      type: 'text',
      query,
      channels,
    })

    await fs.writeFile(logPath, JSON.stringify(globalLog, null, 2), 'utf-8')
  }

  async saveTextSearchResultsLog(results: ChannelTextMatchResults) {
    for (const [channel, matches] of Object.entries(results)) {
      const logPath = path.join(TELEGRAM_CACHE_DIR, channel, 'search_results.json')

      let log: SearchResultsLog = {
        searchedMessages: [],
        reviewedMessages: [],
        unreviewedMessages: [],
      }

      try {
        const data = await fs.readFile(logPath, 'utf-8')
        log = JSON.parse(data)
      } catch {
        // It's okay if the log doesn't exist yet
      }

      const searched = new Set<number>(log.searchedMessages)
      const reviewed = new Set<number>(log.reviewedMessages)
      const unreviewed = new Set<number>(log.unreviewedMessages)

      for (const match of matches) {
        const messageId = extractMessageId(match.link)
        if (messageId === null) continue

        searched.add(messageId)

        if (!reviewed.has(messageId) && !unreviewed.has(messageId)) {
          unreviewed.add(messageId)
        }
      }

      const updatedLog: SearchResultsLog = {
        searchedMessages: Array.from(searched),
        reviewedMessages: Array.from(reviewed),
        unreviewedMessages: Array.from(unreviewed),
      }

      await fs.writeFile(logPath, JSON.stringify(updatedLog, null, 2), 'utf-8')
    }
  }
}
