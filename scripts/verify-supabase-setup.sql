-- ============================================
-- COMPREHENSIVE SUPABASE SETUP VERIFICATION
-- Run this to check if everything is set up correctly
-- ============================================

-- ============================================
-- 1. CHECK FIRM EXISTS
-- ============================================
SELECT '✅ FIRM CHECK' as check_type;
SELECT id, name, created_at 
FROM firms 
WHERE name = 'G. LALOSHI LEGAL';

-- Expected: Should return 1 row with your firm

-- ============================================
-- 2. CHECK ADMIN USER EXISTS AND IS LINKED
-- ============================================
SELECT '✅ ADMIN USER CHECK' as check_type;
SELECT 
  um.id,
  um.name,
  um.role,
  um.firm_id,
  f.name as firm_name,
  au.email,
  um.is_active,
  CASE 
    WHEN um.role = 'Admin' THEN '✅ Admin role set'
    ELSE '❌ Role is: ' || um.role
  END as role_status
FROM users_metadata um
JOIN firms f ON f.id = um.firm_id
JOIN auth.users au ON au.id = um.id
WHERE au.email = 'glaloshilegal@gmail.com';

-- Expected: Should return 1 row with role = 'Admin'

-- ============================================
-- 3. CHECK ROLE CONSTRAINT INCLUDES ADMIN
-- ============================================
SELECT '✅ ROLE CONSTRAINT CHECK' as check_type;
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users_metadata'::regclass
AND conname = 'users_metadata_role_check';

-- Expected: Should show 'Admin' in the CHECK constraint

-- ============================================
-- 4. CHECK ALL REQUIRED TABLES EXIST
-- ============================================
SELECT '✅ TABLES CHECK' as check_type;
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'firms', 'users_metadata', 'clients', 'cases', 'sabs_claims', 
      'tort_claims', 'tasks', 'deadlines', 'documents', 'medical_providers',
      'expert_reports', 'ocf18_submissions', 'lat_applications', 
      'undertakings', 'disbursements', 'settlement_offers', 
      'time_entries', 'activity_logs'
    ) THEN '✅'
    ELSE '⚠️'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'firms', 'users_metadata', 'clients', 'cases', 'sabs_claims', 
  'tort_claims', 'tasks', 'deadlines', 'documents', 'medical_providers',
  'expert_reports', 'ocf18_submissions', 'lat_applications', 
  'undertakings', 'disbursements', 'settlement_offers', 
  'time_entries', 'activity_logs'
)
ORDER BY table_name;

-- Expected: Should show all tables with ✅

-- ============================================
-- 5. CHECK CASE ASSIGNMENT COLUMNS EXIST
-- ============================================
SELECT '✅ CASE ASSIGNMENT COLUMNS CHECK' as check_type;
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('primary_lawyer_id', 'assigned_team_members', 'assigned_paralegal_id') 
    THEN '✅'
    ELSE '⚠️'
  END as status
FROM information_schema.columns
WHERE table_name = 'cases'
AND column_name IN ('primary_lawyer_id', 'assigned_team_members', 'assigned_paralegal_id')
ORDER BY column_name;

-- Expected: Should show 3 columns (primary_lawyer_id, assigned_team_members, assigned_paralegal_id)

-- ============================================
-- 6. CHECK RLS IS ENABLED ON KEY TABLES
-- ============================================
SELECT '✅ RLS CHECK' as check_type;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('firms', 'users_metadata', 'cases', 'clients', 'tasks')
ORDER BY tablename;

-- Expected: rowsecurity should be 't' (true) for all tables

-- ============================================
-- 7. CHECK STORAGE BUCKET EXISTS
-- ============================================
SELECT '✅ STORAGE BUCKET CHECK' as check_type;
SELECT 
  name,
  public,
  created_at
FROM storage.buckets
WHERE name = 'documents';

-- Expected: Should return 1 row with name = 'documents' and public = false

-- ============================================
-- 8. CHECK INDEXES EXIST FOR PERFORMANCE
-- ============================================
SELECT '✅ INDEXES CHECK' as check_type;
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: Should show multiple indexes including idx_cases_primary_lawyer, idx_cases_assigned_paralegal, etc.

-- ============================================
-- SUMMARY
-- ============================================
SELECT '📊 SETUP SUMMARY' as summary;
SELECT 
  (SELECT COUNT(*) FROM firms) as firms_count,
  (SELECT COUNT(*) FROM users_metadata WHERE role = 'Admin') as admin_users_count,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('firms', 'users_metadata', 'cases', 'clients', 'tasks')) as core_tables_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'cases' AND column_name IN ('primary_lawyer_id', 'assigned_team_members', 'assigned_paralegal_id')) as case_assignment_columns_count,
  (SELECT COUNT(*) FROM storage.buckets WHERE name = 'documents') as storage_buckets_count;

-- Expected: 
-- firms_count: 1
-- admin_users_count: 1 (or more)
-- core_tables_count: 5
-- case_assignment_columns_count: 3
-- storage_buckets_count: 1

