import TelegramBot from 'node-telegram-bot-api'
import { withAuth } from '../../../utils/auth.util'

export class BotStartCommand {
  constructor(private bot: TelegramBot) {
    this.bot.onText(
      /\/start/,
      withAuth(async (msg) => {
        const name = msg.from?.first_name || 'друже'

        const greeting = `
        👋 Привіт, ${name}!

        🤖 *Unity Search Bot* — це помічник у пошуку зниклих безвісти в Україні.

        🔍 Я можу допомогти знайти людей за:
        - ім'ям та прізвищем
        - фотографією обличчя

        🗂️ Джерела: відкриті телеграм-канали, публічні ресурси

        Напиши /help для повного списку команд.
      `
        await this.bot.sendMessage(msg.chat.id, greeting, { parse_mode: 'Markdown' })
      }),
    )
  }
}
