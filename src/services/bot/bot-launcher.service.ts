import TelegramBot, { BotCommand } from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import { BotHelpCommand } from './commands/bot-help.command'
import { BotQueryCommand } from './commands/bot-query.command'
import { BotCacheCommand } from './commands/bot-cache.command'
import { BotStartCommand } from './commands/bot-start.command'

dotenv.config()

export class BotLauncherService {
  bot: TelegramBot

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true })
    this.setCommands()
    this.registerCommands()
  }

  private registerCommands() {
    new BotHelpCommand(this.bot)
    new BotQueryCommand(this.bot)
    new BotCacheCommand(this.bot)
    new BotStartCommand(this.bot)
  }

  private async setCommands() {
    const commands: BotCommand[] = [
      { command: 'start', description: 'Почати роботу з ботом' },
      { command: 'query', description: 'Пошук за імʼям' },
      { command: 'cache', description: 'Оновити останні актуальні дані' },
      { command: 'help', description: 'Показати інструкцію' },
    ]

    try {
      await this.bot.setMyCommands(commands)
      console.log('✅ Bot commands set successfully.')
    } catch (err) {
      console.error('❌ Failed to set bot commands:', err)
    }
  }

  public launch() {
    console.log('🤖 Telegram bot started.')
  }
}
