import fs from 'fs/promises'
import path from 'path'

export class SkipperService {
  async loadSkippedIds(channelFolder: string): Promise<Set<number>> {
    const filePath = path.join(channelFolder, 'skipped.json')
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      const ids = JSON.parse(data)
      return new Set<number>(ids)
    } catch {
      return new Set<number>()
    }
  }

  async saveSkippedIds(channelFolder: string, skippedIds: Set<number>) {
    const filePath = path.join(channelFolder, 'skipped.json')
    await fs.writeFile(filePath, JSON.stringify([...skippedIds], null, 2))
  }
}
