-- ============================================
-- VERIFY ADMIN ROLE SETUP
-- Run these queries to check if everything worked
-- ============================================

-- 1. Check that the constraint allows 'Admin'
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users_metadata'::regclass
AND conname = 'users_metadata_role_check';

-- Expected result: Should show 'Admin' in the CHECK constraint

-- 2. Check your user's role
SELECT 
  um.id,
  um.name,
  um.role,
  um.firm_id,
  f.name as firm_name,
  au.email,
  um.is_active,
  um.created_at
FROM users_metadata um
JOIN firms f ON f.id = um.firm_id
JOIN auth.users au ON au.id = um.id
WHERE au.email = 'glaloshilegal@gmail.com';

-- Expected result: role should be 'Admin'

-- 3. Verify all roles are valid (should return no errors)
SELECT DISTINCT role 
FROM users_metadata 
ORDER BY role;

-- Expected result: Should show Admin, Lawyer, LawClerk, etc.

-- 4. Test that 'Admin' is accepted (this should work without error)
SELECT 'Admin'::text WHERE 'Admin' IN ('Admin', 'Lawyer', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator');

-- Expected result: Should return 'Admin'

