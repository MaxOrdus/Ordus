# Your CSV Data Format Analysis

## Column Structure

Your CSV has these columns:
1. **CLIENT NAME** - Client's full name
2. **FILE NO#** - File/case number
3. **Lawyer** - Assigned lawyer name
4. **DOB** - Date of birth (various formats)
5. **Date Of Loss** - Accident date (various formats)
6. **Insurance Co.** - Insurance company name
7. **Policy No.** - Policy number
8. **Claim No.** - Claim number
9. **Adjuster** - Adjuster contact info
10. **MIG Status** - MIG/Non-MIG/CAT status
11. **IRB /NEB** - Benefit type and notes

## Data Quality Issues Handled

### ✅ Date Format Variations
The parser handles all these formats:
- `17-Jul-96` → `1996-07-17`
- `23-12-15` → `2015-12-23`
- `22-01-71` → `1971-01-22`
- `1966-08-03` → `1966-08-03` (already correct)
- `17-12-1971` → `1971-12-17`
- `Feb 6, 2014` → `2014-02-06`
- `7-Sep-19` → `2019-09-07`
- Handles typos like `15-Aprl-16` → `2016-04-15`

### ✅ Missing Data
- Empty DOB fields → Skipped (optional)
- Invalid dates (like "TBD", "waiting for file") → Row skipped
- Empty fields → Handled gracefully

### ✅ Data Cleaning
- Removes extra spaces from names
- Handles quoted values with commas
- Normalizes MIG status variations:
  - "MIG" → MIG
  - "AB Settled" → Settled
  - "TRANSFERRED" → Transferred
  - "Fracture" → Non-MIG
  - "Non-Retainer" → Skipped

### ✅ Benefit Type Normalization
- "IRB" → IRB
- "NEB" → NEB
- "RTW" → RTW
- "IRB/ RTW on 11/25/19" → IRB (with note)

## What Gets Imported

For each valid row:
1. **Client** created (or found if exists)
2. **Case** created with:
   - Title: "Client Name - FILE NO#" (or just name if no file number)
   - Date of Loss (parsed and normalized)
   - Date Opened (uses Date of Loss)
   - File number stored in tags
3. **SABS Claim** created with MIG status
4. **Tort Claim** created with limitation date
5. **Lawyer** assigned (matched by name)

## Rows That Will Be Skipped

- Rows without client name
- Rows without valid Date of Loss
- Rows with "Non-Retainer" status
- Rows with "waiting for file" in date fields

## How to Use

1. Go to **Settings** → **Data Management**
2. Click **"Import Cases from CSV"**
3. Upload your CSV file (`data/my-csv-data.csv`)
4. Review the parsed data:
   - See how many valid cases
   - See which rows have errors
5. Click **"Import Data"**
6. Wait for import to complete
7. Check results and view imported cases

## Expected Results

With ~1,274 rows in your CSV:
- **Valid cases**: Most rows should import successfully
- **Skipped**: Rows with "Non-Retainer", missing dates, etc.
- **Errors**: Rows with invalid date formats that couldn't be parsed

The parser is designed to be forgiving and handle your messy data!

