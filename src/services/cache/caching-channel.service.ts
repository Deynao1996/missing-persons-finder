import path from 'path'
import fs from 'fs/promises'
import { TelegramScraperService } from '../scraping/telegram-scrapper.service'
import { TelegramClientService } from '../client/telegram-client.service'
import { SEARCH_TELEGRAM_FROM, TELEGRAM_CACHE_DIR } from '../../constants'
import { SkipperService } from '../skipper/skipper.service'
import { BatchedImage } from '../../types'

export class CachingChannelService extends TelegramClientService {
  private telegramService = new TelegramScraperService()
  private skipperService = new SkipperService()

  constructor() {
    super()
  }

  async initializeChannelCache(channelUsername: string) {
    await this.processChannelCache(channelUsername, true)
  }

  async updateChannelCache(channelUsername: string) {
    await this.processChannelCache(channelUsername, false)
  }

  private async processChannelCache(channelUsername: string, isInitial: boolean) {
    await this.telegramService.start()
    await this.connect()

    const channelFolder = path.join(TELEGRAM_CACHE_DIR, channelUsername)
    await fs.mkdir(channelFolder, { recursive: true })

    const seenIds = await this.loadExistingCacheIdsFromFolder(channelFolder)
    const skippedIds = await this.skipperService.loadSkippedIds(channelFolder)
    const allSeen = new Set<number>([...seenIds, ...skippedIds])
    const newlySkipped = new Set<number>()

    const startFromId = isInitial ? Math.max(...allSeen) || 0 : Math.max(...allSeen) || 0

    const generator = isInitial
      ? this.telegramService.fetchAllImagesSinceDate({
          channelUsername,
          minDate: new Date(SEARCH_TELEGRAM_FROM),
          startFromId,
          seenIds: allSeen,
          newlySkipped,
        })
      : this.telegramService.fetchNewImagesAfterIdGenerator({
          channelUsername,
          lastSeenMsgId: startFromId,
          seenIds: allSeen,
          newlySkipped,
        })

    for await (const batch of generator) {
      const newLines = await this.processNewItems(batch, allSeen)

      if (newLines.length > 0) {
        const year = new Date(batch[0].meta.msgDate).getFullYear()
        const filePath = path.join(channelFolder, `${year}.ndjson`)
        await fs.appendFile(filePath, newLines.join('\n') + '\n')

        const label = isInitial ? '📦 Cached' : '🔄 Updated cache with'
        console.log(`${label} ${newLines.length} faces to ${filePath}`)
      }

      if (newlySkipped.size > 0) {
        for (const id of newlySkipped) skippedIds.add(id)
        await this.skipperService.saveSkippedIds(channelFolder, skippedIds)
        newlySkipped.clear()
      }
    }

    const status = isInitial ? '✅ Initial cache completed' : '✅ Channel update completed'
    console.log(`${status} for @${channelUsername}`)
  }

  private async loadExistingCacheIdsFromFolder(folderPath: string): Promise<Set<number>> {
    const seenIds = new Set<number>()

    try {
      const files = await fs.readdir(folderPath)

      for (const file of files) {
        if (!file.endsWith('.ndjson')) continue

        const content = await fs.readFile(path.join(folderPath, file), 'utf-8')

        for (const line of content.trim().split('\n')) {
          try {
            const parsed = JSON.parse(line)
            if (typeof parsed.msgId === 'number') {
              seenIds.add(parsed.msgId)
            }
          } catch (err) {
            console.warn(`⚠️ Skipping malformed line in ${file}:`, err)
          }
        }
      }
    } catch (err) {
      console.error(`❌ Failed to load cache from folder ${folderPath}:`, err)
    }

    return seenIds
  }

  async processNewItems(batch: BatchedImage[], seenIds: Set<number>): Promise<string[]> {
    const newLines: string[] = []

    for (const item of batch) {
      const { meta, descriptor } = item

      if (!seenIds.has(meta.msgId)) {
        seenIds.add(meta.msgId)
        newLines.push(
          JSON.stringify({
            msgId: meta.msgId,
            faceIndex: meta.faceIndex,
            date: meta.msgDate.toISOString(),
            descriptor,
            sourceImageUrl: meta.sourceImageUrl,
          }),
        )
      }
    }

    return newLines
  }
}
