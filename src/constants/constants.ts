import dotenv from 'dotenv'

dotenv.config()

export const MAX_IMAGES = 300
export const BATCH_SIZE = 20
//TODO: Change for production
export const MIN_SIMILARITY = 0.5 //0.45 || 0.48 for production
export const PAGE_SIZE = 5

export const TELEGRAM_CACHE_DIR = './data/telegram_cache'
export const SEARCH_TELEGRAM_FROM = '2022-04-21'

// export const SKIPPED_CHANNELS = [
//   'poiskzsuchat',
//   'mariya_ukraine',
//   'PoshukUkraine',
//   'cfddffhu4rt',
//   'NezlamniPoshukUa',
//   'poshukpidchasviyni',
//   'borshukr',
//   'poloneni_zsu',
//   'fgjgdcbjug',
// ]
export const SKIPPED_CHANNELS = undefined
export const PORT = process.env.PORT || 4000
