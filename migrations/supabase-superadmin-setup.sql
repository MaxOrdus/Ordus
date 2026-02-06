-- ============================================
-- SUPER ADMIN SETUP FOR MULTI-TENANT SAAS
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. UPDATE ROLE CONSTRAINT TO INCLUDE SUPERADMIN
-- ============================================
ALTER TABLE users_metadata 
DROP CONSTRAINT IF EXISTS users_metadata_role_check;

ALTER TABLE users_metadata 
ADD CONSTRAINT users_metadata_role_check 
CHECK (role IN ('SuperAdmin', 'Admin', 'Lawyer', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator'));

-- ============================================
-- 2. HELPER FUNCTION: Check if current user is SuperAdmin
-- ============================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users_metadata 
    WHERE id = auth.uid() 
    AND role = 'SuperAdmin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- 3. UPDATE RLS POLICIES FOR SUPERADMIN ACCESS
-- ============================================

-- FIRMS: SuperAdmin can see ALL firms, others see their own
DROP POLICY IF EXISTS "Users can view own firm" ON firms;
CREATE POLICY "View firms"
  ON firms FOR SELECT
  USING (
    is_super_admin() 
    OR id = get_user_firm_id()
  );

-- SuperAdmin can create firms
DROP POLICY IF EXISTS "SuperAdmin can create firms" ON firms;
CREATE POLICY "SuperAdmin can create firms"
  ON firms FOR INSERT
  WITH CHECK (is_super_admin());

-- SuperAdmin can update any firm
DROP POLICY IF EXISTS "SuperAdmin can update firms" ON firms;
CREATE POLICY "SuperAdmin can update firms"
  ON firms FOR UPDATE
  USING (is_super_admin() OR id = get_user_firm_id());

-- SuperAdmin can delete firms
DROP POLICY IF EXISTS "SuperAdmin can delete firms" ON firms;
CREATE POLICY "SuperAdmin can delete firms"
  ON firms FOR DELETE
  USING (is_super_admin());

-- USERS_METADATA: SuperAdmin sees ALL users
DROP POLICY IF EXISTS "Users can view own metadata" ON users_metadata;
DROP POLICY IF EXISTS "Users can view firm members" ON users_metadata;
CREATE POLICY "View users"
  ON users_metadata FOR SELECT
  USING (
    is_super_admin()
    OR firm_id = get_user_firm_id()
    OR id = auth.uid()
  );

-- SuperAdmin can insert users to ANY firm, Firm Admin can insert to their firm
DROP POLICY IF EXISTS "Admins can insert users" ON users_metadata;
DROP POLICY IF EXISTS "Admins can insert users in their firm" ON users_metadata;
CREATE POLICY "Insert users"
  ON users_metadata FOR INSERT
  WITH CHECK (
    is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM users_metadata 
        WHERE id = auth.uid() 
        AND role = 'Admin'
      )
      AND firm_id = get_user_firm_id()
    )
    OR id = auth.uid()
  );

-- SuperAdmin can update ANY user, Firm Admin can update their firm's users
DROP POLICY IF EXISTS "Users can update own metadata" ON users_metadata;
DROP POLICY IF EXISTS "Users can update metadata" ON users_metadata;
CREATE POLICY "Update users"
  ON users_metadata FOR UPDATE
  USING (
    is_super_admin()
    OR id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM users_metadata 
        WHERE id = auth.uid() 
        AND role = 'Admin'
      )
      AND firm_id = get_user_firm_id()
    )
  );

-- SuperAdmin can delete ANY user
DROP POLICY IF EXISTS "SuperAdmin can delete users" ON users_metadata;
CREATE POLICY "Delete users"
  ON users_metadata FOR DELETE
  USING (
    is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM users_metadata 
        WHERE id = auth.uid() 
        AND role = 'Admin'
      )
      AND firm_id = get_user_firm_id()
      AND id != auth.uid()  -- Can't delete yourself
    )
  );

-- CLIENTS: SuperAdmin sees ALL, others see their firm's
DROP POLICY IF EXISTS "Users can view firm clients" ON clients;
CREATE POLICY "View clients"
  ON clients FOR SELECT
  USING (
    is_super_admin()
    OR firm_id = get_user_firm_id()
  );

-- CASES: SuperAdmin sees ALL, others see their firm's
DROP POLICY IF EXISTS "Users can view firm cases" ON cases;
CREATE POLICY "View cases"
  ON cases FOR SELECT
  USING (
    is_super_admin()
    OR firm_id = get_user_firm_id()
  );

DROP POLICY IF EXISTS "Lawyers can create cases" ON cases;
CREATE POLICY "Create cases"
  ON cases FOR INSERT
  WITH CHECK (
    is_super_admin()
    OR firm_id = get_user_firm_id()
  );

DROP POLICY IF EXISTS "Users can update firm cases" ON cases;
CREATE POLICY "Update cases"
  ON cases FOR UPDATE
  USING (
    is_super_admin()
    OR firm_id = get_user_firm_id()
  );

-- ============================================
-- 4. SET YOUR USER AS SUPERADMIN
-- ============================================
-- Replace with your actual user ID from auth.users

UPDATE users_metadata 
SET role = 'SuperAdmin', firm_id = NULL  -- SuperAdmin doesn't belong to a specific firm
WHERE id = (SELECT id FROM auth.users WHERE email = 'glaloshilegal@gmail.com');

-- Or if you know your user ID:
-- UPDATE users_metadata SET role = 'SuperAdmin', firm_id = NULL WHERE id = 'YOUR_USER_ID';

-- ============================================
-- 5. VERIFY SETUP
-- ============================================
SELECT 
  um.id,
  um.name,
  um.role,
  um.firm_id,
  f.name as firm_name
FROM users_metadata um
LEFT JOIN firms f ON um.firm_id = f.id
ORDER BY um.role, um.name;

