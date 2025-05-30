import fs from 'fs/promises'
import { TextMatchResult } from '../types'

export async function readNDJSON(cacheFile: string): Promise<TextMatchResult[]> {
  try {
    const raw = await fs.readFile(cacheFile, 'utf-8')
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

export async function appendToNDJSON(data: TextMatchResult[], cacheFile: string) {
  const lines = data.map((d) => JSON.stringify(d)).join('\n') + '\n'
  await fs.appendFile(cacheFile, lines)
}
