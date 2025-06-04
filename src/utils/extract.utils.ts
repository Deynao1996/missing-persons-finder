import fs from 'fs/promises'
import { TELEGRAM_CACHE_DIR } from '../constants'
import path from 'path'

export function extractMessageId(link: string): number | string | null {
  try {
    const url = new URL(link)

    if (url.hostname === 't.me') {
      // Telegram: extract numeric ID from path
      const match = url.pathname.match(/\/(\d+)(?:\/)?$/)
      return match ? parseInt(match[1], 10) : null
    }

    if (
      url.hostname.includes(process.env.SOURCE_PRIMARY_DOMAIN!) ||
      url.hostname.includes(process.env.SOURCE_SECONDARY_DOMAIN!)
    ) {
      const parts = url.pathname.split('/').filter(Boolean)

      return parts.at(-1) || null
    }

    // Add more sites here if needed
    return null
  } catch {
    return null
  }
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

export function parseSearchQuery(query: string): string[] {
  return query
    .split('/')
    .map((q) => q.trim())
    .filter(Boolean)
}
