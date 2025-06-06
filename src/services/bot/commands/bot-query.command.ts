import TelegramBot from 'node-telegram-bot-api'
import axios from 'axios'
import { withAuth } from '../../../utils/auth.util'
import { PORT } from '../../../constants'

export class BotQueryCommand {
  constructor(private bot: TelegramBot) {
    this.bot.onText(
      /\/query (.+)/,
      withAuth(async (msg, match) => {
        const name = match?.[1]
        if (!name) {
          await this.bot.sendMessage(msg.chat.id, '❌ Вкажіть ім’я або прізвище для пошуку.')
          return // Explicit void return
        }

        try {
          const res = await axios.post(`http://localhost:${PORT}/api/cache/update`)
          await this.bot.sendMessage(
            msg.chat.id,
            `✅ Результати:\n\`\`\`\n${JSON.stringify(res.data, null, 2)}\n\`\`\``,
            { parse_mode: 'Markdown' },
          )
        } catch (err) {
          console.error(err)
          await this.bot.sendMessage(msg.chat.id, '❌ Помилка під час запиту. Спробуйте пізніше.')
        }
      }),
    )
  }
}
