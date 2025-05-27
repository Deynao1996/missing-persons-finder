import fs from 'fs/promises'
import path from 'path'

const PERSONS_DIR = path.resolve(process.cwd(), 'data', 'persons')

export async function getPersonData(index: number = 0): Promise<{
  fullName: string
  imagePath: string
  id: string
} | null> {
  const folders = await fs.readdir(PERSONS_DIR)
  const firstFolder = folders[index]
  if (!firstFolder) return null

  const dataPath = path.join(PERSONS_DIR, firstFolder, 'data.json')
  const raw = await fs.readFile(dataPath, 'utf-8')
  const parsed = JSON.parse(raw)

  return {
    fullName: parsed.query,
    imagePath: path.join(PERSONS_DIR, firstFolder, parsed.imagePath ?? 'photo.jpg'),
    id: parsed.id,
  }
}
