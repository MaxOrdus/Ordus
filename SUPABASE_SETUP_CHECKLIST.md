# Supabase Setup Checklist

Run `scripts/verify-supabase-setup.sql` in Supabase SQL Editor to verify everything is set up.

## ✅ What Should Be Set Up

### 1. Database Schema
- [x] All tables created (firms, users_metadata, cases, clients, tasks, etc.)
- [x] Indexes created for performance
- [x] Triggers for `updated_at` timestamps

### 2. Row Level Security (RLS)
- [x] RLS enabled on all tables
- [x] Policies created for:
  - [x] Firms (users can view own firm)
  - [x] Users metadata (users can view/update own)
  - [x] Cases (firm-level access)
  - [x] Tasks (firm-level access)
  - [x] Documents (firm-level access)
  - [x] All other tables

### 3. Authentication & Users
- [x] First admin user created in Supabase Auth
- [x] User linked to firm in `users_metadata`
- [x] User role set to 'Admin'
- [x] Admin role added to constraint

### 4. Case Assignment Fields
- [x] `primary_lawyer_id` column added to cases
- [x] `assigned_team_members` column added to cases
- [x] `assigned_paralegal_id` column added to cases
- [x] Indexes created for these columns

### 5. Storage
- [x] `documents` bucket created
- [x] Storage policies configured
- [x] Bucket set to Private (not public)

### 6. Environment Variables
- [x] `.env.local` created with:
  - [x] `NEXT_PUBLIC_SUPABASE_URL`
  - [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🔍 How to Verify

### Quick Check (Run in SQL Editor):

```sql
-- Check admin user
SELECT um.name, um.role, f.name as firm_name, au.email
FROM users_metadata um
JOIN firms f ON f.id = um.firm_id
JOIN auth.users au ON au.id = um.id
WHERE au.email = 'glaloshilegal@gmail.com';
-- Should show: role = 'Admin'

-- Check case assignment columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name IN ('primary_lawyer_id', 'assigned_team_members', 'assigned_paralegal_id');
-- Should return 3 rows

-- Check storage bucket
SELECT name, public FROM storage.buckets WHERE name = 'documents';
-- Should show: name = 'documents', public = false
```

### Full Verification

Run the complete verification script:
1. Open Supabase SQL Editor
2. Copy/paste contents of `scripts/verify-supabase-setup.sql`
3. Run it
4. Check all sections show ✅

## 🚨 Common Issues

**Issue**: "role violates check constraint"
- **Fix**: Run `supabase-add-admin-role.sql` to add Admin to allowed roles

**Issue**: "relation does not exist"
- **Fix**: Run `supabase-schema.sql` to create all tables

**Issue**: "permission denied"
- **Fix**: Run `supabase-rls-policies.sql` to set up RLS policies

**Issue**: Storage bucket not found
- **Fix**: Create bucket manually in Storage → New Bucket, then run `supabase-storage-policies.sql`

## 📝 Next Steps After Verification

Once everything is verified:
1. ✅ Test login with your admin account
2. ✅ Create a test case
3. ✅ Assign case to a lawyer
4. ✅ Create a test task
5. ✅ Upload a test document

