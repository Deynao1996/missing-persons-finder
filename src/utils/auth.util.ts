import TelegramBot from 'node-telegram-bot-api'

export function withAuth(
  handler: (msg: TelegramBot.Message, match: RegExpExecArray | null) => Promise<void>,
): (msg: TelegramBot.Message, match: RegExpExecArray | null) => Promise<void> {
  return async (msg, match) => {
    if (msg.from?.id !== Number(process.env.ALLOWED_USER_ID)) {
      console.warn(`Unauthorized access attempt from user ${msg.from?.id}`)
      return
    }
    return handler(msg, match)
  }
}
