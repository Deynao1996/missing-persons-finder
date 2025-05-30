import path from 'path'

export const WEB_CACHE_DIR = path.join(process.cwd(), 'data', 'web_cache', process.env.SOURCE_NAME!)
export const WEB_CACHE_FILE = path.join(WEB_CACHE_DIR, 'cache.ndjson')
