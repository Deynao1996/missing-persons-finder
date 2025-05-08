import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { askQuestion } from '../../utils/ask-question.util'
import dotenv from 'dotenv'

dotenv.config()

export class TelegramClientService {
  private apiId: number
  private apiHash: string
  private session: StringSession
  protected client: TelegramClient

  constructor() {
    this.apiId = parseInt(process.env.TELEGRAM_API_ID!)
    this.apiHash = process.env.TELEGRAM_API_HASH!
    this.session = new StringSession(process.env.TELEGRAM_SESSION || '')
    this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {
      connectionRetries: 5,
    })
  }

  public async start(): Promise<void> {
    await this.client.start({
      phoneNumber: async () => await askQuestion('📱 Enter your phone number: '),
      password: async () => await askQuestion('🔐 Enter your 2FA password (if any): '),
      phoneCode: async () => await askQuestion('📩 Enter the Telegram code you received: '),
      onError: console.error,
    })

    console.log('✅ Logged in successfully.')
    const sessionString = this.client.session.save()
    console.log('🔐 Save this session string in .env as TELEGRAM_SESSION:')
    console.log(sessionString)
  }

  public getClient(): TelegramClient {
    return this.client
  }

  protected async connect(): Promise<void> {
    if (!this.client.connected) {
      await this.client.connect()
    }
  }
}
