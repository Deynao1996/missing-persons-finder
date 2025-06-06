import fs from 'fs/promises'
import path from 'path'

const PERSONS_DIR = path.resolve(process.cwd(), 'data', 'persons')

export class PersonsDataService {
  async getAllPersonsData(): Promise<{ fullName: string; imagePath: string; id: string }[]> {
    const folders = await fs.readdir(PERSONS_DIR)
    const persons: {
      fullName: string
      imagePath: string
      id: string
    }[] = []

    for (const folder of folders) {
      const dataPath = path.join(PERSONS_DIR, folder, 'data.json')

      try {
        const raw = await fs.readFile(dataPath, 'utf-8')
        const parsed = JSON.parse(raw)

        persons.push({
          fullName: parsed.query,
          imagePath: path.join(PERSONS_DIR, folder, parsed.imagePath ?? 'photo.jpg'),
          id: parsed.id,
        })
      } catch (err) {
        console.warn(`⚠️ Failed to read person data in folder: ${folder}`, err)
        continue
      }
    }

    return persons
  }

  async getPersonData(index: number = 0): Promise<{
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
}
