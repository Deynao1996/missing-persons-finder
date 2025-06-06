import TelegramBot from 'node-telegram-bot-api'
import { withAuth } from '../../../utils/auth.util'

export class BotHelpCommand {
  constructor(private bot: TelegramBot) {
    this.bot.onText(
      /\/help/,
      withAuth(async (msg) => {
        const helpMessage = `
        🆘 *Довідка Unity Search Bot*  

        Цей бот допомагає знайти зниклих людей внаслідок війни, використовуючи відкриті телеграм-канали та публічні джерела.

        📌 *Доступні команди:*

        /start – Почати роботу з ботом  
        /help – Показати це повідомлення  
        /query Ім'я Прізвище – Пошук за текстовим запитом  
        /cache назва_каналу – Запустити кешування вказаного телеграм-каналу  
        (наприклад: /cache example_channel)

        /photo – Надішліть фото, щоб знайти схожі обличчя *(додаткова підтримка скоро)*

        🤝 Дякуємо, що не залишаєтесь байдужими.
      `
        await this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' })
      }),
    )
  }
}
