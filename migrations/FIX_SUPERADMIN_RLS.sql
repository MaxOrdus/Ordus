-- ============================================
-- FIX SUPERADMIN RLS POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create the is_super_admin() helper function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users_metadata 
    WHERE id = auth.uid() 
    AND role = 'SuperAdmin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 2: Fix FIRMS policies - SuperAdmin can do everything
DROP POLICY IF EXISTS "Users can view own firm" ON firms;
DROP POLICY IF EXISTS "View firms" ON firms;
DROP POLICY IF EXISTS "SuperAdmin can create firms" ON firms;
DROP POLICY IF EXISTS "SuperAdmin can update firms" ON firms;
DROP POLICY IF EXISTS "SuperAdmin can delete firms" ON firms;

-- SELECT: SuperAdmin sees all, others see their own firm
CREATE POLICY "View firms"
  ON firms FOR SELECT
  USING (
    is_super_admin() 
    OR id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

-- INSERT: Only SuperAdmin can create firms
CREATE POLICY "Create firms"
  ON firms FOR INSERT
  WITH CHECK (is_super_admin());

-- UPDATE: SuperAdmin can update any firm, admins can update their own
CREATE POLICY "Update firms"
  ON firms FOR UPDATE
  USING (
    is_super_admin() 
    OR id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

-- DELETE: Only SuperAdmin can delete firms
CREATE POLICY "Delete firms"
  ON firms FOR DELETE
  USING (is_super_admin());

-- Step 3: Fix USERS_METADATA policies
DROP POLICY IF EXISTS "Users can view own metadata" ON users_metadata;
DROP POLICY IF EXISTS "Users can view firm members" ON users_metadata;
DROP POLICY IF EXISTS "View users" ON users_metadata;
DROP POLICY IF EXISTS "Insert users" ON users_metadata;
DROP POLICY IF EXISTS "Update users" ON users_metadata;
DROP POLICY IF EXISTS "Delete users" ON users_metadata;

-- SELECT: SuperAdmin sees all, others see their firm
CREATE POLICY "View users"
  ON users_metadata FOR SELECT
  USING (
    is_super_admin()
    OR firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
    OR id = auth.uid()
  );

-- INSERT: SuperAdmin can add to any firm, Admins to their firm, users can create own
CREATE POLICY "Insert users"
  ON users_metadata FOR INSERT
  WITH CHECK (
    is_super_admin()
    OR id = auth.uid()
    OR (
      (SELECT role FROM users_metadata WHERE id = auth.uid()) = 'Admin'
      AND firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
    )
  );

-- UPDATE: SuperAdmin can update any, Admins their firm, users themselves
CREATE POLICY "Update users"
  ON users_metadata FOR UPDATE
  USING (
    is_super_admin()
    OR id = auth.uid()
    OR (
      (SELECT role FROM users_metadata WHERE id = auth.uid()) = 'Admin'
      AND firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
    )
  );

-- DELETE: SuperAdmin can delete any, Admins can delete their firm's users
CREATE POLICY "Delete users"
  ON users_metadata FOR DELETE
  USING (
    is_super_admin()
    OR (
      (SELECT role FROM users_metadata WHERE id = auth.uid()) = 'Admin'
      AND firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
      AND id != auth.uid()
    )
  );

-- Step 4: Verify your user is SuperAdmin
SELECT id, name, role, firm_id 
FROM users_metadata 
WHERE id = auth.uid();

-- If your role is not 'SuperAdmin', run this (replace with your email):
-- UPDATE users_metadata 
-- SET role = 'SuperAdmin', firm_id = NULL
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'glaloshilegal@gmail.com');

