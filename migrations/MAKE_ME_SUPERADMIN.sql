-- ============================================
-- MAKE G. LALOSHI SUPERADMIN
-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- Step 1: Update role constraint to allow SuperAdmin
ALTER TABLE users_metadata 
DROP CONSTRAINT IF EXISTS users_metadata_role_check;

ALTER TABLE users_metadata 
ADD CONSTRAINT users_metadata_role_check 
CHECK (role IN ('SuperAdmin', 'Admin', 'Lawyer', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator'));

-- Step 2: Create helper function for SuperAdmin checks
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users_metadata 
    WHERE id = auth.uid() 
    AND role = 'SuperAdmin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 3: Make your account SuperAdmin
-- SuperAdmin doesn't belong to any specific firm (firm_id = NULL)
UPDATE users_metadata 
SET role = 'SuperAdmin', firm_id = NULL
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'glaloshilegal@gmail.com'
);

-- Step 4: Verify it worked
SELECT 
  um.id,
  au.email,
  um.name,
  um.role,
  um.firm_id
FROM users_metadata um
JOIN auth.users au ON um.id = au.id
WHERE au.email = 'glaloshilegal@gmail.com';

