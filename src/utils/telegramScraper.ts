import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import dotenv from 'dotenv'

dotenv.config()

const apiId = Number(process.env.TELEGRAM_API_ID)
const apiHash = process.env.TELEGRAM_API_HASH || ''
const stringSession = new StringSession('')

export const fetchTelegramMessages = async (channel: string): Promise<string[]> => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 })
  await client.connect()

  const messages = await client.getMessages(channel, { limit: 10 })
  await client.disconnect()

  return messages.map((msg) => msg.message || '')
}
