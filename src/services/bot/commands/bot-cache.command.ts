import TelegramBot, { Message } from 'node-telegram-bot-api'
import axios, { AxiosResponse } from 'axios'
import { withAuth } from '../../../utils/auth.util'
import { PORT } from '../../../constants'
import { CacheUpdateResponse } from '../../../types/bot'

export class BotCacheCommand {
  private readonly CACHE_UPDATE_URL = `http://localhost:${PORT}/api/cache/update`

  constructor(private bot: TelegramBot) {
    this.registerCommandHandler()
  }

  private registerCommandHandler(): void {
    this.bot.onText(/\/cache/, withAuth(this.handleCacheCommand.bind(this)))
  }

  private async handleCacheCommand(msg: TelegramBot.Message): Promise<void> {
    try {
      await this.sendInitialResponse(msg)
      const response = await this.fetchCacheUpdate()
      await this.processResponse(msg, response.data)
    } catch (err) {
      await this.handleError(msg, err)
    }
  }

  private async fetchCacheUpdate(): Promise<AxiosResponse<CacheUpdateResponse>> {
    return await axios.post<CacheUpdateResponse>(this.CACHE_UPDATE_URL)
  }

  private async processResponse(msg: TelegramBot.Message, data: CacheUpdateResponse): Promise<Message> {
    if (!data.success) {
      return await this.sendErrorMessage(msg)
    }

    if (!data.updated || Object.keys(data.updated).length === 0) {
      return await this.sendNoUpdatesMessage(msg)
    }

    return await this.sendSuccessReport(msg, data.updated)
  }

  private generateUpdateReport(updates: Record<string, number>): string {
    return Object.entries(updates)
      .map(([source, count]) => {
        const boldCount = `<b>${count}</b>`
        if (source.startsWith('@')) {
          return count > 0 ? `🔄 ${source}: додано ${boldCount} нових зображень` : `✅ ${source}: без нових змін`
        }
        return count > 0 ? `🌐 ${source}: додано ${boldCount} нових записів` : `✅ ${source}: без нових змін`
      })
      .join('\n')
  }

  private async sendInitialResponse(msg: TelegramBot.Message): Promise<Message> {
    return await this.bot.sendMessage(msg.chat.id, '🔄 Оновлення даних розпочато. Це може зайняти кілька хвилин...')
  }

  private async sendErrorMessage(msg: TelegramBot.Message): Promise<Message> {
    return await this.bot.sendMessage(msg.chat.id, '❌ Помилка під час оновлення кешу.')
  }

  private async sendNoUpdatesMessage(msg: TelegramBot.Message): Promise<Message> {
    return await this.bot.sendMessage(msg.chat.id, '⚠️ Дані не були оновлені.')
  }

  private async sendSuccessReport(msg: TelegramBot.Message, updates: Record<string, number>): Promise<Message> {
    const report = this.generateUpdateReport(updates)
    return await this.bot.sendMessage(msg.chat.id, `📦 Результати оновлення:\n\n${report}`, { parse_mode: 'HTML' })
  }

  private async handleError(msg: TelegramBot.Message, err: unknown): Promise<void> {
    console.error('Cache update error:', err)
    try {
      await this.sendErrorMessage(msg)
    } catch (sendError) {
      console.error('Failed to send error message:', sendError)
    }
  }
}
