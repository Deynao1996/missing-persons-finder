import fs from 'fs/promises'
import { TELEGRAM_CACHE_DIR } from '../constants'
import path from 'path'

export function extractMessageId(url: string): number | null {
  const match = url.match(/\/(\d+)(?:\/)?$/)
  return match ? parseInt(match[1], 10) : null
}

export async function extractAvailableTelegramChannels(exclude: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(path.join(TELEGRAM_CACHE_DIR), { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !exclude.includes(name))
}

export function parseTelegramLink(url: string): { channel: string; messageId: number } | null {
  const match = url.match(/t\.me\/([^/]+)\/(\d+)/)
  if (!match) return null
  return { channel: match[1], messageId: parseInt(match[2], 10) }
}
