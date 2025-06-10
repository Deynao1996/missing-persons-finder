import TelegramBot from 'node-telegram-bot-api'
import { BotNameQueryHandler } from '../handlers/bot-name-query.handler'
import axios from 'axios'
import { PAGE_SIZE, PORT } from '../../../constants'
import { PersonResult } from '../../../types/bot'

export class BotFullNameQueryCommand extends BotNameQueryHandler {
  private static readonly COMMAND_REGEX = /\/query_fullname(?: (\d+))?(?: (.+))?/
  private static readonly CALLBACK_PREFIX = 'query_fullname_page_'

  constructor(bot: TelegramBot) {
    super(bot)
    this.registerCommands()
  }

  protected registerCommands(): void {
    this.bot.onText(BotFullNameQueryCommand.COMMAND_REGEX, async (msg, match) => {
      const page = parseInt(match?.[1] || '1', 10)
      const fullName = match?.[2]
      await this.handleCommand(msg.chat.id, page, fullName)
    })

    this.bot.on('callback_query', async (callbackQuery) => {
      const { data, message, id } = callbackQuery
      if (data?.startsWith(BotFullNameQueryCommand.CALLBACK_PREFIX) && message) {
        const nextPage = parseInt(data.split('_').pop() || '1', 10)
        await this.bot.answerCallbackQuery(id)
        await this.handleCommand(message.chat.id, nextPage)
      }
    })
  }

  protected async fetchData(page: number, fullName?: string): Promise<{ results: PersonResult[] }> {
    const { data } = await axios.post<{ results: PersonResult[] }>(`http://localhost:${PORT}/api/query/by-full-name`, {
      fullName,
      page,
      pageSize: PAGE_SIZE,
    })
    return data
  }

  protected buildResultsMessage(results: PersonResult[], page: number): string {
    return `📄 Результати пошуку за іменем (сторінка ${page}):\n\n`
  }

  private async handleCommand(chatId: number, page: number, fullName?: string): Promise<void> {
    try {
      await this.sendSearchingMessage(chatId)
      const { results } = await this.fetchData(page, fullName)

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
    } catch (err) {
      await this.handleError(chatId, err)
    }
  }
}
