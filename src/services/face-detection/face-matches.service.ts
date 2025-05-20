import * as faceapi from 'face-api.js'
import { FaceMatcherResult } from '../scraping/types'
import * as readline from 'readline'
import fs, { promises as promisesFs } from 'fs'
import path from 'path'
import { TELEGRAM_CACHE_DIR } from '../../constants'
import { extractAvailableTelegramChannels } from '../../utils/extract.utils'

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

    const channels = await extractAvailableTelegramChannels()
    for (const channelName of channels) {
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

    // Optionally sort each channel's matches by similarity
    for (const channel of Object.keys(resultsByChannel)) {
      resultsByChannel[channel].sort((a, b) => b.similarity - a.similarity)
    }

    return resultsByChannel
  }
}
