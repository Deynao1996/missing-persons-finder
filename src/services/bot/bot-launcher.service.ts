import TelegramBot, { BotCommand } from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import { BotHelpCommand } from './commands/bot-help.command'
import { BotCacheCommand } from './commands/bot-cache.command'
import { BotStartCommand } from './commands/bot-start.command'
import { BotIdQueryCommand } from './commands/bot-id-query.command'
import { BotFullNameQueryCommand } from './commands/bot-full-name-query.command'

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
    new BotIdQueryCommand(this.bot)
    new BotFullNameQueryCommand(this.bot)
    new BotCacheCommand(this.bot)
    new BotStartCommand(this.bot)
  }

  private async setCommands() {
    const commands: BotCommand[] = [
      { command: 'start', description: 'Почати роботу з ботом' },
      { command: 'query_name_data', description: 'Пошук за імʼям занесених осіб' },
      { command: 'query_image_data', description: 'Пошук за фотографією занесених осіб' },
      { command: 'query_fullname', description: 'Пошук за повним імʼям' },
      { command: 'query_image', description: 'Пошук за фотографією' },
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
