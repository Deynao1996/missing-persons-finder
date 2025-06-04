import { ExcelToNdjsonConverter } from './services/converter/excel-to-ndjson.converter'

const converter = new ExcelToNdjsonConverter('export.xlsx', 'cache.ndjson')
converter.convert()
