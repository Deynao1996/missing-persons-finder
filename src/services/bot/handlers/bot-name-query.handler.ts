import TelegramBot from 'node-telegram-bot-api'
import { PersonResult } from '../../../types/bot'

export abstract class BotNameQueryHandler {
  protected static readonly MESSAGE_CHUNK_SIZE = 4000

  constructor(protected bot: TelegramBot) {}

  // Common methods
  protected async sendSearchingMessage(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, '🔍 Виконую пошук...', { parse_mode: 'Markdown' })
  }

  protected async sendNoResultsMessage(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, 'ℹ️ Нічого не знайдено.', { parse_mode: 'Markdown' })
  }

  protected async handleError(chatId: number, error: unknown): Promise<void> {
    console.error('❌ Помилка запиту:', error)
    await this.bot.sendMessage(chatId, '❌ Помилка під час запиту. Спробуйте пізніше.')
  }

  protected buildPersonResultBlock(person: PersonResult): string {
    const { fullName, results: personResults } = person
    let block = `👤 <b>${escapeHtml(fullName)}</b>\n`

    if (Object.keys(personResults).length === 0) {
      block += '— 🔍 Збігів не знайдено\n\n'
    } else {
      for (const [source, entries] of Object.entries(personResults)) {
        block += `— 📌 <b>${escapeHtml(source)}</b>:\n`
        for (const entry of entries) {
          const shortText = entry.text.slice(0, 100).replace(/\n/g, ' ')
          block += `  • <a href="${entry.link}">${escapeHtml(entry.date ?? 'без дати')}</a>\n`
          block += `    <i>${escapeHtml(shortText)}</i>\n`
        }
      }
      block += '\n'
    }
    return block
  }

  protected async sendLongMessage(chatId: number, html: string): Promise<void> {
    const chunks = this.splitIntoChunks(html, BotNameQueryHandler.MESSAGE_CHUNK_SIZE)
    for (const chunk of chunks) {
      await this.bot.sendMessage(chatId, chunk.trim(), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      })
    }
  }

  protected splitIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = []
    let current = ''

    for (const line of text.split('\n')) {
      if ((current + '\n' + line).length > maxLength) {
        chunks.push(current)
        current = line
      } else {
        current += '\n' + line
      }
    }

    if (current) chunks.push(current)
    return chunks
  }

  // Abstract methods to be implemented by child classes
  protected abstract registerCommands(): void
  protected abstract fetchData(
    page: number,
    queryParam?: string,
  ): Promise<{ results: PersonResult[]; hasMore?: boolean }>
  protected abstract buildResultsMessage(results: PersonResult[], page: number): string
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
