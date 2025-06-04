import path from 'path'

export const WEB_PRIMARY_CACHE_DIR = path.join(process.cwd(), 'data', 'web_cache', process.env.SOURCE_PRIMARY_NAME!)
export const WEB_PRIMARY_CACHE_FILE = path.join(WEB_PRIMARY_CACHE_DIR, 'cache.ndjson')

export const WEB_SECONDARY_CACHE_DIR = path.join(process.cwd(), 'data', 'web_cache', process.env.SOURCE_SECONDARY_NAME!)
export const WEB_SECONDARY_CACHE_FILE = path.join(WEB_SECONDARY_CACHE_DIR, 'cache.ndjson')
