import * as faceapi from 'face-api.js'
import * as readline from 'readline'
import fs, { promises as promisesFs } from 'fs'
import path from 'path'
import { SKIPPED_CHANNELS, TELEGRAM_CACHE_DIR } from '../../constants'
import { extractAvailableTelegramChannels, extractMessageId } from '../../utils/extract.utils'
import { FaceMatcherResult, SearchResultsLog } from '../types'

async function* readNDJSONLines(filePath: string): AsyncGenerator<string> {
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({ input: fileStream })

  for await (const line of rl) {
    yield line
  }
}

export class FaceMatchesService {
  async findDescriptorMatchesAcrossAllChannels(
    inputDescriptor: Float32Array,
    minSimilarity: number,
    minYear?: number,
  ): Promise<Record<string, FaceMatcherResult[]>> {
    const resultsByChannel: Record<string, FaceMatcherResult[]> = {}

    const channels = await extractAvailableTelegramChannels(SKIPPED_CHANNELS)
    for (const channelName of channels) {
      const channelDir = path.join(TELEGRAM_CACHE_DIR, channelName)

      // Load reviewed message IDs from search_results.json
      const resultsLogPath = path.join(channelDir, 'search_results.json')
      let reviewedIds = new Set<number>()
      try {
        const resultsLogRaw = await promisesFs.readFile(resultsLogPath, 'utf-8')
        const parsedLog: SearchResultsLog = JSON.parse(resultsLogRaw)
        reviewedIds = new Set(parsedLog.reviewedMessages)
      } catch {
        // Fine if file doesn't exist
      }

      // Read year files
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

              if (reviewedIds.has(messageId)) continue // Skip already reviewed

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

    // Sort matches per channel by similarity
    for (const channel of Object.keys(resultsByChannel)) {
      resultsByChannel[channel].sort((a, b) => b.similarity - a.similarity)
    }

    return resultsByChannel
  }
}
