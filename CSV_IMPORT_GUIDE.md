# CSV Import Feature - Complete Guide

## Where It Lives in the App

### 1. **Settings Page** (`/settings`)
   - Go to Settings → Data Management section
   - Click "Import Cases from CSV" button
   - Opens the Migration Wizard

### 2. **Migration Wizard Component** (`components/onboarding/MigrationWizard.tsx`)
   - Step 1: Upload CSV file
   - Step 2: Review parsed data (shows valid/invalid cases)
   - Step 3: Import results

### 3. **CSV Parser** (`lib/csv-parser.ts`)
   - Parses CSV files
   - Maps columns to case data
   - Validates data

### 4. **Import Service** (`lib/csv-import-service.ts`)
   - Creates clients
   - Creates cases
   - Links to SABS/Tort claims
   - Handles errors

## How It Works

### Step-by-Step Flow:

1. **User clicks "Import Cases from CSV"** in Settings
2. **Migration Wizard opens** (modal overlay)
3. **User uploads CSV file**
4. **CSV Parser** (`lib/csv-parser.ts`):
   - Reads file content
   - Parses CSV rows
   - Maps columns (handles variations like "client_name", "Client Name", "clientname")
   - Validates required fields
   - Returns valid/invalid cases

5. **User reviews** parsed data:
   - See how many cases are valid
   - See which rows have errors
   - Can proceed or cancel

6. **Import Service** (`lib/csv-import-service.ts`):
   - For each valid case:
     - Creates/finds client
     - Creates case record
     - Creates SABS claim
     - Creates Tort claim
     - Calculates limitation dates
     - Links to lawyers/paralegals (if emails provided)

7. **Results shown**:
   - Success count
   - Failed count
   - Error details

## CSV Format

Use the template: `templates/case-import-template.csv`

**Required columns:**
- `client_name` (or variations: Client Name, clientname)
- `case_title` (or: Case Title, title, case_name)
- `date_of_loss` (or: Date of Loss, DOL, accident_date)
- `date_opened` (or: Date Opened, opened, open_date)

**Optional columns:**
- `client_email`, `client_phone`, `client_dob`
- `estimated_value`, `status`, `stage`
- `primary_lawyer_email`, `paralegal_email`
- `mig_status` (MIG, Non-MIG, CAT)
- `notes`

## Column Name Flexibility

The parser is smart - it handles variations:
- `client_name` = `Client Name` = `clientname` = `ClientName`
- Case-insensitive matching
- Handles underscores, spaces, camelCase

## What Gets Created

For each valid CSV row:

1. **Client** (if doesn't exist):
   - Name, email, phone, DOB

2. **Case**:
   - Title, dates, status, stage
   - Estimated value
   - Linked to client

3. **SABS Claim**:
   - MIG status
   - Medical/rehab limits
   - CAT status

4. **Tort Claim**:
   - Limitation date (auto-calculated)
   - Limitation status

5. **Deadlines** (auto-generated):
   - SABS notice
   - OCF-1 deadline
   - Tort limitation
   - etc.

## Error Handling

- **Invalid rows** are shown before import
- **Failed imports** are reported with row numbers
- **Validation errors** include:
  - Missing required fields
  - Invalid date formats
  - Invalid values

## Limitations

1. **Lawyer/Paralegal lookup by email**: 
   - Currently limited (can't access auth.users from client)
   - Would need server action for full email lookup
   - Workaround: Match by name or assign to current user

2. **Large files**:
   - Processes sequentially (could be slow for 1000+ cases)
   - Could be optimized with batch inserts

## Usage Example

1. Prepare CSV file matching template
2. Go to Settings → Data Management
3. Click "Import Cases from CSV"
4. Upload your CSV
5. Review parsed data
6. Click "Import Data"
7. See results
8. Click "View Cases" to see imported cases

## Files Involved

- `lib/csv-parser.ts` - Parses CSV files
- `lib/csv-import-service.ts` - Imports to database
- `components/onboarding/MigrationWizard.tsx` - UI component
- `app/settings/page.tsx` - Entry point
- `templates/case-import-template.csv` - CSV template

## Next Steps

To improve:
1. Add server action for email lookup
2. Add batch import for large files
3. Add progress bar for long imports
4. Add ability to download error report
5. Add preview of what will be created

