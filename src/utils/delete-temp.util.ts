import fs from 'fs'

export async function deleteTempFolder(folderPath: string) {
  try {
    if (fs.existsSync(folderPath)) {
      await fs.promises.rm(folderPath, { recursive: true, force: true })
      console.log('Temporary folder deleted.')
    }
  } catch (err) {
    console.error('Error deleting temp folder:', err)
  }
}
