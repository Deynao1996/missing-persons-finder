import dotenv from 'dotenv'
import { BotLauncherService } from './services/bot/bot-launcher.service'
dotenv.config()

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN not set')
}

const bot = new BotLauncherService(token)
bot.launch()
