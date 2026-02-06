/**
 * Custom CSV Parser for Messy Real-World Data
 * Handles inconsistent date formats, missing fields, and data quality issues
 */

export interface CSVRow {
  [key: string]: string
}

export interface ParsedCaseData {
  clientName: string
  fileNumber?: string
  lawyerName?: string
  clientDob?: string
  dateOfLoss: string
  insuranceCompany?: string
  policyNumber?: string
  claimNumber?: string
  adjuster?: string
  migStatus?: string
  benefitType?: string
  notes?: string
}

/**
 * Parse CSV file content into rows
 * Handles quoted values, commas in fields, etc.
 */
export function parseCSV(csvContent: string): CSVRow[] {
  // Remove BOM (Byte Order Mark) if present (common in Excel exports)
  const cleanedContent = csvContent.replace(/^\uFEFF/, '')
  
  // Remove comment lines at the top
  const lines = cleanedContent
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('#'))
  
  if (lines.length === 0) return []

  // Parse header - handle the actual header row
  const headerLine = lines.find(line => 
    line.includes('CLIENT NAME') || 
    line.includes('CLIENT NAME') ||
    line.toLowerCase().includes('client')
  ) || lines[0]
  
  const headers = parseCSVLine(headerLine).map(h => h.trim().replace(/\r$/, '')) // Remove trailing \r
  
  // Parse data rows
  const rows: CSVRow[] = []
  const headerStartIndex = lines.indexOf(headerLine)
  const expectedColumnCount = headers.length
  
  for (let i = headerStartIndex + 1; i < lines.length; i++) {
    let values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every(v => !v.trim())) continue
    
    // Fix column misalignment caused by unquoted commas in client names
    // Pattern: "Last, First" creates an extra column, shifting everything right
    // Detection: If Lawyer column (index 2) contains a file number pattern, we're misaligned
    if (values.length > expectedColumnCount) {
      const lawyerIndex = headers.findIndex(h => h.toLowerCase().includes('lawyer'))
      const fileNoIndex = headers.findIndex(h => h.toLowerCase().includes('file') && h.toLowerCase().includes('no'))
      
      // Check if Lawyer column contains a file number (strong indicator of misalignment)
      if (lawyerIndex >= 0 && lawyerIndex < values.length) {
        const valueAtLawyerPos = values[lawyerIndex]?.trim() || ''
        // File numbers match pattern: 2+ uppercase letters followed by digits (MAT11343, MAMU002, AVGI100)
        if (/^[A-Z]{2,}\d+/.test(valueAtLawyerPos)) {
          // Definitely misaligned - merge first two columns as client name
          if (values[0] && values[1]) {
            values[0] = `${values[0]}, ${values[1]}`
            values.splice(1, 1) // Remove the second column
          }
        }
      }
      
      // Also check FILE NO# column - if it doesn't look like a file number but next column does
      if (fileNoIndex >= 0 && fileNoIndex < values.length && values.length > expectedColumnCount) {
        const valueAtFileNoPos = values[fileNoIndex]?.trim() || ''
        const looksLikeFileNo = /^[A-Z]{2,}\d+/.test(valueAtFileNoPos)
        
        if (!looksLikeFileNo && fileNoIndex + 1 < values.length) {
          const nextValue = values[fileNoIndex + 1]?.trim() || ''
          if (/^[A-Z]{2,}\d+/.test(nextValue)) {
            // File number is in next column - merge first two as client name
            if (values[0] && values[1]) {
              values[0] = `${values[0]}, ${values[1]}`
              values.splice(1, 1)
            }
          }
        }
      }
      
      // Final safety check: if still misaligned and we have extra columns, merge first two
      if (values.length > expectedColumnCount && values[0] && values[1]) {
        // Check if second value looks like a name (not a file number)
        const secondValue = values[1]?.trim() || ''
        if (!/^[A-Z]{2,}\d+/.test(secondValue) && secondValue.length > 0) {
          values[0] = `${values[0]}, ${values[1]}`
          values.splice(1, 1)
        }
      }
    }
    
    const row: CSVRow = {}
    headers.forEach((header, index) => {
      const cleanHeader = header.trim()
      row[cleanHeader] = (values[index]?.trim() || '').replace(/^"|"$/g, '') // Remove quotes
    })
    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line handling quoted values and commas within quotes
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
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
 * Normalize and parse various date formats
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null
  
  const cleaned = dateStr.trim()
  
  // Skip if it's not a date (contains text like "TBD", "waiting", etc.)
  if (cleaned.match(/TBD|waiting|non|retainer|settled|transferred/i)) {
    return null
  }

  // Format: DD-MMM-YY (e.g., "17-Jul-96", "23-12-15")
  const ddmmyy1 = cleaned.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/)
  if (ddmmyy1) {
    const [, day, month, year] = ddmmyy1
    const monthMap: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
      'aprl': '04' // Handle typo
    }
    const monthNum = monthMap[month.toLowerCase()]
    if (monthNum) {
      const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`
      return `${fullYear}-${monthNum}-${day.padStart(2, '0')}`
    }
  }

  // Format: DD-MM-YY (e.g., "23-12-15", "22-01-71")
  const ddmmyy2 = cleaned.match(/^(\d{1,2})-(\d{2})-(\d{2})$/)
  if (ddmmyy2) {
    const [, day, month, year] = ddmmyy2
    const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`
    return `${fullYear}-${month}-${day.padStart(2, '0')}`
  }

  // Format: YYYY-MM-DD (e.g., "1966-08-03")
  const yyyymmdd = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (yyyymmdd) {
    return cleaned
  }

  // Format: DD-MM-YYYY (e.g., "17-12-1971")
  const ddmmyyyy = cleaned.match(/^(\d{1,2})-(\d{2})-(\d{4})$/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    return `${year}-${month}-${day.padStart(2, '0')}`
  }

  // Format: "MMM DD, YYYY" (e.g., "Feb 6, 2014")
  const mmmddyyyy = cleaned.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/)
  if (mmmddyyyy) {
    const [, month, day, year] = mmmddyyyy
    const monthMap: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    const monthNum = monthMap[month.toLowerCase()]
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`
    }
  }

  // Format: Single digit day (e.g., "7-Sep-19")
  const singleDigitDay = cleaned.match(/^(\d{1})-([A-Za-z]{3})-(\d{2})$/)
  if (singleDigitDay) {
    const [, day, month, year] = singleDigitDay
    const monthMap: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    const monthNum = monthMap[month.toLowerCase()]
    if (monthNum) {
      const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`
      return `${fullYear}-${monthNum}-${day.padStart(2, '0')}`
    }
  }

  return null // Could not parse
}

/**
 * Clean client name (remove extra spaces, normalize)
 */
function cleanClientName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/,\s*,/g, ',') // Remove empty parts
}

/**
 * Map CSV columns to case data structure
 * Handles your specific column names and variations
 */
export function mapCSVToCaseData(row: CSVRow): ParsedCaseData | null {
  // Flexible column matching
  const getValue = (variations: string[]): string => {
    for (const variation of variations) {
      const key = Object.keys(row).find(
        k => k.toLowerCase().replace(/[#_\s\/]/g, '') === variation.toLowerCase().replace(/[#_\s\/]/g, '')
      )
      if (key && row[key]) {
        return row[key].trim()
      }
    }
    return ''
  }

  const clientName = cleanClientName(getValue(['CLIENT NAME', 'client_name', 'clientname', 'client', 'name']))
  const fileNumber = getValue(['FILE NO#', 'file_no', 'fileno', 'file_number', 'file'])
  const lawyerName = getValue(['Lawyer', 'lawyer', 'attorney', 'assigned_lawyer'])
  const dobRaw = getValue(['DOB', 'dob', 'date_of_birth', 'birthdate'])
  const dateOfLossRaw = getValue(['Date Of Loss', 'date_of_loss', 'dol', 'accident_date', 'dateofloss'])
  const insuranceCompany = getValue(['Insurance Co.', 'insurance_co', 'insurance', 'insurer'])
  const policyNumber = getValue(['Policy No.', 'policy_no', 'policy_number', 'policy'])
  const claimNumber = getValue(['Claim No.', 'claim_no', 'claim_number', 'claim'])
  const adjuster = getValue(['Adjuster', 'adjuster', 'adjuster_name'])
  const migStatus = getValue(['MIG Status', 'mig_status', 'migstatus', 'mig'])
  const benefitType = getValue(['IRB /NEB', 'irb_neb', 'benefit_type', 'benefits'])

  // Required fields
  if (!clientName) {
    return null // Skip rows without client name
  }

  // Parse dates
  const clientDob = parseDate(dobRaw)
  const dateOfLoss = parseDate(dateOfLossRaw)

  // Date of Loss is required
  if (!dateOfLoss) {
    return null // Skip rows without valid date of loss
  }

  // Collect notes from various fields (will be preserved in case notes)
  const caseNotes: string[] = []
  
  // Add benefit type info if it contains non-standard values
  if (benefitType && !['IRB', 'NEB', 'RTW', 'Caregiver'].includes(normalizeBenefitType(benefitType) || '')) {
    caseNotes.push(`Benefit Info: ${benefitType}`)
  }
  
  // Add adjuster info if it's unusually long (might contain contact details)
  if (adjuster && adjuster.length > 50) {
    caseNotes.push(`Adjuster Details: ${adjuster}`)
  }

  return {
    clientName,
    fileNumber: fileNumber || undefined,
    lawyerName: lawyerName || undefined,
    clientDob: clientDob || undefined,
    dateOfLoss,
    insuranceCompany: insuranceCompany || undefined,
    policyNumber: policyNumber || undefined,
    claimNumber: claimNumber || undefined,
    adjuster: adjuster || undefined,
    migStatus: normalizeMIGStatus(migStatus),
    benefitType: normalizeBenefitType(benefitType),
    notes: caseNotes.length > 0 ? caseNotes.join('; ') : undefined,
  }
}

/**
 * Normalize MIG status values
 */
function normalizeMIGStatus(status: string): string | undefined {
  if (!status) return undefined
  
  const normalized = status.trim().toLowerCase()
  
  if (normalized.includes('mig')) return 'MIG'
  if (normalized.includes('non-mig') || normalized.includes('non mig')) return 'Non-MIG'
  if (normalized.includes('cat') || normalized.includes('catastrophic')) return 'CAT'
  if (normalized.includes('settled') || normalized.includes('ab settled')) return 'Settled'
  if (normalized.includes('transferred')) return 'Transferred'
  if (normalized.includes('fracture')) return 'Non-MIG' // Fracture likely non-MIG
  if (normalized.includes('non-retainer') || normalized.includes('non retainer')) return undefined
  
  return undefined
}

/**
 * Normalize benefit type
 */
function normalizeBenefitType(benefit: string): string | undefined {
  if (!benefit) return undefined
  
  const normalized = benefit.trim().toLowerCase()
  
  if (normalized.includes('irb')) return 'IRB'
  if (normalized.includes('neb')) return 'NEB'
  if (normalized.includes('rtw') || normalized.includes('return to work')) return 'RTW'
  if (normalized.includes('caregiver')) return 'Caregiver'
  
  return undefined
}

/**
 * Validate parsed case data
 */
export function validateCaseData(data: ParsedCaseData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.clientName) errors.push('Client name is required')
  if (!data.dateOfLoss) errors.push('Date of loss is required')

  // Validate date format (should be YYYY-MM-DD after parsing)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (data.dateOfLoss && !dateRegex.test(data.dateOfLoss)) {
    errors.push(`Invalid date of loss format: ${data.dateOfLoss}`)
  }
  if (data.clientDob && !dateRegex.test(data.clientDob)) {
    errors.push(`Invalid date of birth format: ${data.clientDob}`)
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
  stats: {
    totalRows: number
    validRows: number
    invalidRows: number
    skippedRows: number
  }
}> {
  const text = await file.text()
  const rows = parseCSV(text)
  
  const valid: ParsedCaseData[] = []
  const invalid: Array<{ row: number; data: ParsedCaseData; errors: string[] }> = []
  let skippedRows = 0

  rows.forEach((row, index) => {
    const caseData = mapCSVToCaseData(row)
    if (!caseData) {
      skippedRows++
      return
    }

    const validation = validateCaseData(caseData)
    if (validation.valid) {
      valid.push(caseData)
    } else {
      invalid.push({
        row: index + 2, // +2 for header and 0-based index
        data: caseData,
        errors: validation.errors,
      })
    }
  })

  return {
    valid,
    invalid,
    stats: {
      totalRows: rows.length,
      validRows: valid.length,
      invalidRows: invalid.length,
      skippedRows,
    },
  }
}

