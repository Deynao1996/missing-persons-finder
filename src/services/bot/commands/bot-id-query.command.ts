import TelegramBot from 'node-telegram-bot-api'
import axios from 'axios'
import { PAGE_SIZE, PORT } from '../../../constants'
import { BotNameQueryHandler } from '../handlers/bot-name-query.handler'
import { PersonResult, QueryResponse } from '../../../types/bot'

export class BotIdQueryCommand extends BotNameQueryHandler {
  private static readonly COMMAND_REGEX = /\/query_name_data(?: (\d+))?/
  private static readonly CALLBACK_PREFIX = 'query_name_data_page_'

  constructor(bot: TelegramBot) {
    super(bot)
    this.registerCommands()
  }

  protected registerCommands(): void {
    this.bot.onText(BotIdQueryCommand.COMMAND_REGEX, async (msg, match) => {
      const page = parseInt(match?.[1] || '1', 10)
      await this.handleCommand(msg.chat.id, page)
    })

    this.bot.on('callback_query', async (callbackQuery) => {
      const { data, message, id } = callbackQuery
      if (data?.startsWith(BotIdQueryCommand.CALLBACK_PREFIX) && message) {
        const nextPage = parseInt(data.split('_').pop() || '1', 10)
        await this.bot.answerCallbackQuery(id)
        await this.handleCommand(message.chat.id, nextPage)
      }
    })
  }

  protected async fetchData(page: number): Promise<{ results: PersonResult[]; hasMore: boolean }> {
    const { data } = await axios.post<QueryResponse>(`http://localhost:${PORT}/api/query/data/by-full-name`, {
      all: true,
      page,
      pageSize: PAGE_SIZE,
    })
    return data
  }

  protected buildResultsMessage(results: PersonResult[], page: number): string {
    return `📄 Результати пошуку (сторінка ${page}):\n\n`
  }

  private async handleCommand(chatId: number, page: number): Promise<void> {
    try {
      await this.sendSearchingMessage(chatId)
      const { results, hasMore } = await this.fetchData(page)

      if (!results || results.length === 0) {
        await this.sendNoResultsMessage(chatId)
        return
      }

      let message = this.buildResultsMessage(results, page)
      const messagesToSend: string[] = []

      for (const person of results) {
        const personBlock = this.buildPersonResultBlock(person)

        if ((message + personBlock).length > BotNameQueryHandler.MESSAGE_CHUNK_SIZE) {
          messagesToSend.push(message)
          message = ''
        }
        message += personBlock
      }

      if (message.length > 0) {
        messagesToSend.push(message)
      }

      for (const msg of messagesToSend) {
        await this.sendLongMessage(chatId, msg.trim())
      }

      if (hasMore) {
        await this.sendNextPagePrompt(chatId, page)
      }
    } catch (err) {
      await this.handleError(chatId, err)
    }
  }

  private async sendNextPagePrompt(chatId: number, currentPage: number): Promise<void> {
    await this.bot.sendMessage(chatId, '➡️ Хочете побачити наступну сторінку?', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `➡️ Наступна сторінка (${currentPage + 1})`,
              callback_data: `${BotIdQueryCommand.CALLBACK_PREFIX}${currentPage + 1}`,
            },
          ],
        ],
      },
    })
  }
}
