# Setting Up Your Admin Account and Team Structure

## Step 1: Link Your First User (Admin/Senior Lawyer)

You've already created your first user in Supabase Auth Dashboard. Now you need to link them to your firm.

### Run This SQL in Supabase SQL Editor:

1. Open `setup-first-admin.sql` in your project
2. **IMPORTANT**: Replace these values:
   - `'your-email@example.com'` → Your actual email (the one you used in Auth Dashboard)
   - `'Your Name'` → Your actual name
3. Copy the SQL and run it in Supabase SQL Editor

**Or run this directly** (replace the values):

```sql
-- Create firm
INSERT INTO firms (name)
VALUES ('G. LALOSHI LEGAL')
ON CONFLICT DO NOTHING;

-- Link your user to the firm
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Your Name',  -- ⚠️ CHANGE THIS
  'Lawyer',
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL' LIMIT 1),
  true
FROM auth.users
WHERE auth.users.email = 'your-email@example.com'  -- ⚠️ CHANGE THIS
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role, firm_id = EXCLUDED.firm_id;
```

## Step 2: Add Case Assignment Fields (One-Time Setup)

Run this SQL to add lawyer/team assignment fields to cases:

```sql
-- Run supabase-add-case-assignment.sql
-- Or copy/paste the contents from that file
```

This adds:
- `primary_lawyer_id` - Senior or Junior Lawyer assigned to case
- `assigned_team_members` - Array of user IDs (clerks, supporting lawyers)
- `assigned_paralegal_id` - Paralegal handling SABS work

## Step 3: Create Additional Users

### For Each New User:

1. **Create user in Supabase Auth Dashboard**:
   - Go to Authentication → Users → Add user
   - Enter email and password
   - Copy the user's email

2. **Link to firm via SQL**:

```sql
-- For Junior Lawyer
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Junior Lawyer Name',
  'Lawyer',
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL'),
  true
FROM auth.users
WHERE auth.users.email = 'junior-lawyer@example.com';

-- For Clerk
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Clerk Name',
  'LawClerk',
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL'),
  true
FROM auth.users
WHERE auth.users.email = 'clerk@example.com';

-- For Paralegal
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Paralegal Name',
  'AccidentBenefitsCoordinator',
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL'),
  true
FROM auth.users
WHERE auth.users.email = 'paralegal@example.com';

-- For Paralegal Clerk
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Paralegal Clerk Name',
  'LawClerk',  -- Same role as regular clerk
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL'),
  true
FROM auth.users
WHERE auth.users.email = 'paralegal-clerk@example.com';
```

## Step 4: Assign Cases to Lawyers

When creating or updating a case, you can now assign it:

```typescript
import { createCase, updateCase } from '@/lib/db/cases'

// Create case with primary lawyer
await createCase({
  title: 'Smith v. Jones',
  clientId: 'client-id',
  dateOfLoss: '2024-01-15',
  primaryLawyerId: 'lawyer-user-id',  // Senior or Junior Lawyer
  assignedTeamMembers: ['clerk-1-id', 'clerk-2-id'],  // Supporting team
  assignedParalegalId: 'paralegal-id',  // For SABS work
  // ... other fields
})

// Update case assignment
await updateCase('case-id', {
  primaryLawyerId: 'new-lawyer-id',
  assignedTeamMembers: ['clerk-3-id'],
})
```

## Step 5: Query Cases by Team Member

```typescript
import { getCasesByLawyer, getCasesByParalegal } from '@/lib/db/users'

// Get all cases for a lawyer (primary or team member)
const lawyerCases = await getCasesByLawyer('lawyer-user-id')

// Get all cases for a paralegal
const paralegalCases = await getCasesByParalegal('paralegal-user-id')
```

## Organizational Structure Example

Based on your description:

```
G. LALOSHI LEGAL
│
├── You (Senior Lawyer/Admin)
│   ├── Junior Lawyer 1 → Cases assigned via primary_lawyer_id
│   │   ├── Clerk 1 → Added to assigned_team_members
│   │   └── Clerk 2 → Added to assigned_team_members
│   ├── Junior Lawyer 2
│   │   └── Clerk 3
│   └── Shared Clerks (3-4) → Can be on multiple cases
│
└── Paralegal Team
    ├── Paralegal 1 → Cases assigned via assigned_paralegal_id
    ├── Paralegal 2
    └── Paralegal Clerks (5-6) → Added to assigned_team_members
```

## How It Works

1. **Case Assignment**:
   - `primary_lawyer_id` = Main lawyer responsible (Senior or Junior)
   - `assigned_team_members` = Array of supporting team (clerks, junior lawyers)
   - `assigned_paralegal_id` = Paralegal handling SABS work

2. **Cross-Team Collaboration**:
   - A case can have a primary lawyer (Tort work)
   - AND a paralegal (SABS work)
   - AND multiple team members (clerks, junior lawyers)

3. **Visibility**:
   - Users see cases where they are:
     - Primary lawyer
     - In assigned_team_members array
     - Assigned paralegal
   - RLS policies ensure users only see their firm's cases

## Next Steps

1. ✅ Run `setup-first-admin.sql` to link your user
2. ✅ Run `supabase-add-case-assignment.sql` to add assignment fields
3. ⏳ Create additional users as needed
4. ⏳ Start assigning cases to lawyers and teams
5. ⏳ Test the login flow

## Verification

After setting up, verify everything works:

```sql
-- Check your user is linked
SELECT um.*, f.name as firm_name, au.email
FROM users_metadata um
JOIN firms f ON f.id = um.firm_id
JOIN auth.users au ON au.id = um.id
WHERE au.email = 'your-email@example.com';

-- Check case assignment fields exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name IN ('primary_lawyer_id', 'assigned_team_members', 'assigned_paralegal_id');
```

You should see:
- Your user linked to the firm ✅
- Three new columns in cases table ✅

