import * as faceapi from 'face-api.js'
import * as readline from 'readline'
import fs, { promises as promisesFs } from 'fs'
import path from 'path'
import { SKIPPED_CHANNELS, TELEGRAM_CACHE_DIR } from '../../constants'
import { extractAvailableTelegramChannels, extractMessageId } from '../../utils/extract.utils'
import { LoggerService } from '../logs/logger.service'
import { EnrichedFaceMatcherResult, FaceMatcherResult } from '../../types'

async function* readNDJSONLines(filePath: string): AsyncGenerator<string> {
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({ input: fileStream })

  for await (const line of rl) {
    yield line
  }
}

export class FaceMatchesService {
  private loggerService = new LoggerService()

  async findDescriptorMatchesAcrossAllChannels(
    inputDescriptor: Float32Array,
    minSimilarity: number,
    queryId: string,
    minYear?: number,
  ): Promise<EnrichedFaceMatcherResult> {
    const resultsByChannel: EnrichedFaceMatcherResult = {}

    const log = await this.loggerService.loadChannelLog() // Load once
    const reviewed = log.reviewedMessages?.[queryId] || {}

    const channels = await extractAvailableTelegramChannels(SKIPPED_CHANNELS)

    for (const channelName of channels) {
      const reviewedIds = new Set(reviewed[channelName] || [])

      const channelDir = path.join(TELEGRAM_CACHE_DIR, channelName)

      const yearFiles = (await promisesFs.readdir(channelDir))
        .filter((file) => file.endsWith('.ndjson'))
        .filter((file) => {
          const year = parseInt(file.split('.')[0], 10)
          return !minYear || year >= minYear
        })

      for (const yearFile of yearFiles) {
        const filePath = path.join(channelDir, yearFile)
        const year = parseInt(yearFile.split('.')[0], 10)

        try {
          for await (const line of readNDJSONLines(filePath)) {
            try {
              const item = JSON.parse(line)
              const messageId = extractMessageId(item.sourceImageUrl)
              if (messageId === null) continue
              if (reviewedIds.has(messageId)) continue // ✅ Skip reviewed

              const candidateDescriptor = new Float32Array(item.descriptor)
              const similarity = 1 - faceapi.euclideanDistance(inputDescriptor, candidateDescriptor)

              if (similarity >= minSimilarity) {
                const match: FaceMatcherResult & { year: number } = {
                  similarity,
                  meta: item.meta,
                  sourceImageUrl: item.sourceImageUrl,
                  year,
                }

                if (!resultsByChannel[channelName]) {
                  resultsByChannel[channelName] = []
                }
                resultsByChannel[channelName].push(match)
              }
            } catch (err) {
              console.warn(`⚠️ Failed to parse line in ${filePath}:`, err)
            }
          }
        } catch (err) {
          console.warn(`⚠️ Error reading ${filePath}:`, err)
        }
      }
    }

    for (const channel of Object.keys(resultsByChannel)) {
      resultsByChannel[channel].sort((a, b) => b.similarity - a.similarity)
    }

    return resultsByChannel
  }
}
