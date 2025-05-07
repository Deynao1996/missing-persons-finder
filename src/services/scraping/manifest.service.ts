import fs from 'fs'
import path from 'path'
import { ScrapedImage } from './types'

export class ManifestService {
  saveRouteManifest(routeSlug: string, images: ScrapedImage[], manifestsDir: string) {
    const manifestPath = path.join(manifestsDir, `${routeSlug}.json`)
    const existing = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) : []

    const updated = [...existing, ...images]
    fs.writeFileSync(manifestPath, JSON.stringify(updated, null, 2))
  }
}
