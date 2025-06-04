import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { getFormattedDate } from '../../utils/dates.util'
import dotenv from 'dotenv'

dotenv.config()

export class ExcelToNdjsonConverter {
  private inputPath: string
  private outputPath: string
  private locale: string

  constructor(inputPath: string, outputPath: string, locale = 'uk-UA') {
    this.inputPath = inputPath
    this.outputPath = outputPath
    this.locale = locale
  }

  public convert(): void {
    const workbook = XLSX.readFile(this.inputPath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    const output = fs.createWriteStream(path.resolve(this.outputPath))
    const now = getFormattedDate()

    rows.forEach((row) => {
      const text = String(row[1] || '').trim()
      if (!text) return

      const linkId = String(row[0] || '').trim()

      const obj = {
        text,
        link: `${process.env.SOURCE_SECONDARY_URL!}/${linkId}/`,
        date: now,
      }

      output.write(JSON.stringify(obj) + '\n')
    })

    output.end(() => {
      console.log('✅ NDJSON file created successfully.')
    })
  }
}
