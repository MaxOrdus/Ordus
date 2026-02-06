# CSV Team Member Extraction & User Creation

## Overview

The CSV import feature now automatically extracts team member names (lawyers, paralegals, clerks) from your CSV file and helps you build your user database. This solves the "chicken and egg" problem: **you don't need users in the database before importing cases!**

## How It Works

### 1. **Automatic Extraction**
When you upload a CSV file, the system:
- Scans the "Lawyer" column (or similar) for all unique names
- Determines roles based on context:
  - `"George (AB ONLY)"` → `AccidentBenefitsCoordinator` (Paralegal)
  - Names with "clerk" → `LawClerk`
  - Names with "assistant" → `LegalAssistant`
  - Default → `Lawyer`
- Counts how many cases each person appears in

### 2. **Smart Matching**
During import, the system:
- Tries to match CSV names to existing users in your database
- Uses fuzzy matching (first name, last name, full name)
- If a match is found → assigns the case to that user
- If no match → preserves the name in case notes

### 3. **User Creation Helper**
After import, you'll see:
- List of unmatched team members
- SQL script generator to create users for them
- Copy-to-clipboard functionality

## Example Workflow

### Step 1: Upload CSV
Your CSV has a "Lawyer" column with values like:
- `"Jillian Carrington"`
- `"George (AB ONLY)"`
- `"Brandon Greeenwood"`
- `"Joshua Himel"`

### Step 2: Review Extraction
The import wizard shows:
```
3 Team Member(s) Found in CSV
- Jillian Carrington (Lawyer) - 1 case(s)
- George (AccidentBenefitsCoordinator) - 3 case(s)
- Brandon Greeenwood (Lawyer) - 5 case(s)
- Joshua Himel (Lawyer) - 8 case(s)
```

### Step 3: Import Cases
- Cases are imported
- Names are matched to existing users (if any)
- Unmatched names are preserved in case notes

### Step 4: Create Users (if needed)
If you see unmatched lawyers:
1. Click "📋 Click to copy SQL for creating these users"
2. Copy the generated SQL
3. For each user:
   - Create them in Supabase Auth Dashboard (Authentication → Users → Add user)
   - Update the email in the SQL script
   - Run the SQL in Supabase SQL Editor
4. Re-import or manually update case assignments

## Generated SQL Example

```sql
-- Jillian Carrington (Lawyer) - Appears in 1 case(s)
-- Original CSV value: "Jillian Carrington"
--
-- Step 1: Create user in Supabase Auth Dashboard with email: jillian.carrington@example.com
-- Step 2: Run this SQL (replace email with actual email):
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT
  auth.users.id,
  'Jillian Carrington',
  'Lawyer',
  'your-firm-id'::uuid,
  true
FROM auth.users
WHERE auth.users.email = 'jillian.carrington@example.com' -- ⚠️ CHANGE THIS to actual email
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  firm_id = EXCLUDED.firm_id,
  is_active = true;
```

## Role Detection Logic

The system determines roles based on CSV context:

| CSV Value | Detected Role | Reason |
|-----------|--------------|--------|
| `"George (AB ONLY)"` | `AccidentBenefitsCoordinator` | Contains "(AB ONLY)" |
| `"John Clerk"` | `LawClerk` | Contains "clerk" |
| `"Jane Assistant"` | `LegalAssistant` | Contains "assistant" |
| `"Michael Blois"` | `Lawyer` | Default assumption |

## Benefits

✅ **No pre-setup required** - Import cases before creating users  
✅ **Automatic role detection** - Smart parsing of CSV context  
✅ **Name preservation** - Unmatched names saved in case notes  
✅ **Easy user creation** - Generated SQL scripts ready to use  
✅ **Fuzzy matching** - Handles name variations and typos  

## Next Steps

1. **Import your CSV** - The system will extract team members automatically
2. **Review unmatched names** - Check the import results
3. **Create users** - Use the generated SQL to create user accounts
4. **Re-assign cases** (optional) - Update case assignments after users are created

## Notes

- Names are cleaned (parenthetical notes removed) for matching
- Fuzzy matching handles variations like "Brandon Greeenwood" vs "Brandon Greenwood"
- All original CSV values are preserved in case notes
- You can manually update case assignments after users are created

