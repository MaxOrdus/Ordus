/**
 * CSV Parser and Import Service
 * Handles parsing CSV files and importing cases/clients into the database
 */

export interface CSVRow {
  [key: string]: string
}

export interface ParsedCaseData {
  clientName: string
  clientEmail?: string
  clientPhone?: string
  clientDob?: string
  caseTitle: string
  dateOfLoss: string
  dateOpened: string
  estimatedValue?: number
  status?: string
  stage?: string
  primaryLawyerEmail?: string
  paralegalEmail?: string
  migStatus?: string
  notes?: string
}

/**
 * Parse CSV file content into rows
 */
export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  // Parse header
  const headers = parseCSVLine(lines[0])
  
  // Parse data rows
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue
    
    const row: CSVRow = {}
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || ''
    })
    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  values.push(current) // Add last value
  return values
}

/**
 * Map CSV columns to case data structure
 * Handles various column name variations
 */
export function mapCSVToCaseData(row: CSVRow): ParsedCaseData | null {
  // Column name mappings (flexible matching)
  const getValue = (variations: string[]): string => {
    for (const variation of variations) {
      const key = Object.keys(row).find(
        k => k.toLowerCase().replace(/[_\s]/g, '') === variation.toLowerCase().replace(/[_\s]/g, '')
      )
      if (key && row[key]) return row[key]
    }
    return ''
  }

  const clientName = getValue(['client_name', 'clientname', 'client', 'name'])
  const caseTitle = getValue(['case_title', 'casetitle', 'title', 'case_name', 'casename'])
  const dateOfLoss = getValue(['date_of_loss', 'dateofloss', 'dol', 'accident_date', 'accidentdate'])
  const dateOpened = getValue(['date_opened', 'dateopened', 'opened', 'open_date', 'opendate'])

  // Required fields
  if (!clientName || !caseTitle || !dateOfLoss || !dateOpened) {
    return null // Skip invalid rows
  }

  return {
    clientName,
    clientEmail: getValue(['client_email', 'clientemail', 'email']),
    clientPhone: getValue(['client_phone', 'clientphone', 'phone']),
    clientDob: getValue(['client_dob', 'clientdob', 'dob', 'date_of_birth', 'dateofbirth', 'birthdate']),
    caseTitle,
    dateOfLoss,
    dateOpened,
    estimatedValue: parseFloat(getValue(['estimated_value', 'estimatedvalue', 'value', 'case_value'])) || undefined,
    status: getValue(['status', 'case_status', 'casestatus']) || 'Active',
    stage: getValue(['stage', 'case_stage', 'casestage']) || 'Intake',
    primaryLawyerEmail: getValue(['primary_lawyer_email', 'lawyer_email', 'lawyeremail', 'lawyer']),
    paralegalEmail: getValue(['paralegal_email', 'paralegalemail', 'paralegal']),
    migStatus: getValue(['mig_status', 'migstatus', 'mig']) || 'MIG',
    notes: getValue(['notes', 'note', 'description', 'desc']),
  }
}

/**
 * Validate parsed case data
 */
export function validateCaseData(data: ParsedCaseData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.clientName) errors.push('Client name is required')
  if (!data.caseTitle) errors.push('Case title is required')
  if (!data.dateOfLoss) errors.push('Date of loss is required')
  if (!data.dateOpened) errors.push('Date opened is required')

  // Validate date formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (data.dateOfLoss && !dateRegex.test(data.dateOfLoss)) {
    errors.push(`Invalid date of loss format: ${data.dateOfLoss} (expected YYYY-MM-DD)`)
  }
  if (data.dateOpened && !dateRegex.test(data.dateOpened)) {
    errors.push(`Invalid date opened format: ${data.dateOpened} (expected YYYY-MM-DD)`)
  }
  if (data.clientDob && !dateRegex.test(data.clientDob)) {
    errors.push(`Invalid date of birth format: ${data.clientDob} (expected YYYY-MM-DD)`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Parse CSV file and return validated case data
 */
export async function parseCSVFile(file: File): Promise<{
  valid: ParsedCaseData[]
  invalid: Array<{ row: number; data: ParsedCaseData; errors: string[] }>
}> {
  const text = await file.text()
  const rows = parseCSV(text)
  
  const valid: ParsedCaseData[] = []
  const invalid: Array<{ row: number; data: ParsedCaseData; errors: string[] }> = []

  rows.forEach((row, index) => {
    const caseData = mapCSVToCaseData(row)
    if (!caseData) {
      invalid.push({
        row: index + 2, // +2 because index is 0-based and we skip header
        data: {} as ParsedCaseData,
        errors: ['Missing required fields'],
      })
      return
    }

    const validation = validateCaseData(caseData)
    if (validation.valid) {
      valid.push(caseData)
    } else {
      invalid.push({
        row: index + 2,
        data: caseData,
        errors: validation.errors,
      })
    }
  })

  return { valid, invalid }
}

