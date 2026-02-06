# Adding Your Files (Cases) and Data to Ordus

There are **three ways** to add your existing cases and data:

## Method 1: Using the App UI (Best for Small Batches)

### Adding Cases One by One:

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Login** with your admin account

3. **Create a Client First** (if needed):
   - Go to `/clients` page
   - Click "New Client"
   - Fill in client details
   - Save

4. **Create a Case**:
   - Go to `/cases/new` page
   - Fill in:
     - Client name
     - Date of Loss (DOL)
     - Client birth date (for limitation period calculation)
     - Other case details
   - Click "Create Case"
   - The system will auto-generate:
     - Critical deadlines
     - Initial tasks
     - SABS and Tort claim records

### Adding Tasks:
- Go to `/tasks` page
- Click "New Task"
- Assign to case, user, set due date, etc.

## Method 2: CSV Import (Best for Bulk Import)

### Step 1: Prepare Your CSV File

Create a CSV file with these columns (see `templates/case-import-template.csv`):

**Required columns:**
- `client_name` - Client's full name
- `client_email` - Client email (optional)
- `client_phone` - Client phone (optional)
- `client_dob` - Date of birth (YYYY-MM-DD)
- `case_title` - Case title/name
- `date_of_loss` - Date of loss (YYYY-MM-DD)
- `date_opened` - Date case opened (YYYY-MM-DD)

**Optional columns:**
- `estimated_value` - Estimated case value
- `status` - Active, Stalled, Critical, Settled, Closed
- `stage` - Intake, SABS Application, Discovery, etc.
- `primary_lawyer_email` - Email of assigned lawyer
- `paralegal_email` - Email of assigned paralegal
- `mig_status` - MIG, Non-MIG, CAT
- `notes` - Case notes (comma-separated)

### Step 2: Use the Import Script

I'll create a script to import your CSV. For now, you can:

1. **Use the Migration Wizard** (when implemented):
   - Go to Settings → Data Migration
   - Upload your CSV
   - Review column mapping
   - Import

2. **Or use SQL Import** (see Method 3)

## Method 3: SQL Bulk Import (Fastest for Large Datasets)

### Import Cases via SQL:

```sql
-- First, create clients (if not exists)
INSERT INTO clients (firm_id, name, email, phone, date_of_birth)
SELECT 
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL' LIMIT 1),
  'John Smith',
  'john@example.com',
  '555-0100',
  '1980-01-15'
ON CONFLICT DO NOTHING;

-- Then create cases
INSERT INTO cases (
  firm_id,
  client_id,
  title,
  date_of_loss,
  date_opened,
  status,
  stage,
  estimated_value,
  primary_lawyer_id
)
SELECT 
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL' LIMIT 1),
  (SELECT id FROM clients WHERE name = 'John Smith' LIMIT 1),
  'Smith v. Insurance Co.',
  '2024-01-15',
  '2024-01-20',
  'Active',
  'Intake',
  50000,
  (SELECT id FROM users_metadata WHERE name = 'Gjergji Laloshi' LIMIT 1)
RETURNING id;

-- Create SABS claim for the case
INSERT INTO sabs_claims (case_id, mig_status, cat_status)
SELECT 
  (SELECT id FROM cases WHERE title = 'Smith v. Insurance Co.' LIMIT 1),
  'MIG',
  'Not Assessed';

-- Create Tort claim
INSERT INTO tort_claims (case_id, limitation_date, limitation_status)
SELECT 
  (SELECT id FROM cases WHERE title = 'Smith v. Insurance Co.' LIMIT 1),
  '2026-01-15', -- DOL + 2 years
  'Active';
```

## Method 4: Using Database Service Functions (For Developers)

If you're comfortable with code, you can create a script:

```typescript
import { createCase } from '@/lib/db/cases'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Get your firm_id and user_id first
const { data: firm } = await supabase
  .from('firms')
  .select('id')
  .eq('name', 'G. LALOSHI LEGAL')
  .single()

const { data: user } = await supabase
  .from('users_metadata')
  .select('id')
  .eq('email', 'glaloshilegal@gmail.com')
  .single()

// Create a case
await createCase({
  title: 'Smith v. Insurance Co.',
  clientId: 'client-id-here',
  dateOfLoss: '2024-01-15',
  dateOpened: '2024-01-20',
  status: 'Active',
  stage: 'Intake',
  estimatedValue: 50000,
  primaryLawyerId: user.id,
  sabs: {
    caseId: '',
    migStatus: 'MIG',
    catStatus: 'Not Assessed',
    // ... other SABS fields
  },
  tort: {
    caseId: '',
    limitationDate: '2026-01-15',
    limitationStatus: 'Active',
    // ... other Tort fields
  }
})
```

## Recommended Approach

**For 1-10 cases**: Use Method 1 (UI)
**For 10-100 cases**: Use Method 2 (CSV Import) - I'll create the import tool
**For 100+ cases**: Use Method 3 (SQL Bulk Import)

## Next Steps

1. **Try creating one case via UI** to see how it works
2. **Let me know your data format** - I can create a custom import script
3. **Share a sample CSV** - I'll create a parser for your specific format

Would you like me to:
- Create a CSV import tool?
- Create SQL templates for your specific data?
- Build a bulk import page in the app?

