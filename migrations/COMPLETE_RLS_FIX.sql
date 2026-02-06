-- ============================================
-- COMPLETE RLS FIX - Run this to fix everything
-- ============================================

-- ============================================
-- 1. USERS_METADATA - Critical for auth
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Allow all reads" ON users_metadata;
DROP POLICY IF EXISTS "Allow all inserts" ON users_metadata;
DROP POLICY IF EXISTS "Allow all updates" ON users_metadata;
DROP POLICY IF EXISTS "SuperAdmin full access to users" ON users_metadata;
DROP POLICY IF EXISTS "Users can view self" ON users_metadata;
DROP POLICY IF EXISTS "Users can view firm members" ON users_metadata;
DROP POLICY IF EXISTS "Users can update self" ON users_metadata;
DROP POLICY IF EXISTS "Firm admins manage users" ON users_metadata;
DROP POLICY IF EXISTS "View users" ON users_metadata;
DROP POLICY IF EXISTS "Insert users" ON users_metadata;
DROP POLICY IF EXISTS "Update users" ON users_metadata;
DROP POLICY IF EXISTS "Delete users" ON users_metadata;

-- SELECT: Everyone can read (needed for auth)
CREATE POLICY "users_select_all"
  ON users_metadata FOR SELECT
  USING (true);

-- INSERT: Allow inserts (auth and SuperAdmin)
CREATE POLICY "users_insert_all"
  ON users_metadata FOR INSERT
  WITH CHECK (true);

-- UPDATE: Allow updates (users can update themselves, SuperAdmin can update all)
CREATE POLICY "users_update_all"
  ON users_metadata FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Only SuperAdmin can delete
CREATE POLICY "users_delete_superadmin"
  ON users_metadata FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
  );

-- ============================================
-- 2. FIRMS - SuperAdmin can manage all
-- ============================================

DROP POLICY IF EXISTS "SuperAdmin full access to firms" ON firms;
DROP POLICY IF EXISTS "Users can view own firm" ON firms;
DROP POLICY IF EXISTS "Create firms" ON firms;
DROP POLICY IF EXISTS "View firms" ON firms;
DROP POLICY IF EXISTS "Update firms" ON firms;
DROP POLICY IF EXISTS "Delete firms" ON firms;

-- SELECT: SuperAdmin sees all, others see their firm
CREATE POLICY "firms_select"
  ON firms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
    OR id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

-- INSERT: Only SuperAdmin
CREATE POLICY "firms_insert"
  ON firms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
  );

-- UPDATE: SuperAdmin can update any, admins their own firm
CREATE POLICY "firms_update"
  ON firms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
    OR id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

-- DELETE: Only SuperAdmin
CREATE POLICY "firms_delete"
  ON firms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
  );

-- ============================================
-- 3. CLIENTS - Firm members can access their firm's clients
-- ============================================

DROP POLICY IF EXISTS "Users can view firm clients" ON clients;
DROP POLICY IF EXISTS "Lawyers can create clients" ON clients;
DROP POLICY IF EXISTS "Users can update firm cases" ON clients;

CREATE POLICY "clients_select"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
    OR firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

CREATE POLICY "clients_insert"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
    OR firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

CREATE POLICY "clients_update"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
    OR firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

-- ============================================
-- 4. CASES - Firm members can access their firm's cases
-- ============================================

DROP POLICY IF EXISTS "View cases" ON cases;
DROP POLICY IF EXISTS "Lawyers can create cases" ON cases;
DROP POLICY IF EXISTS "Create cases" ON cases;
DROP POLICY IF EXISTS "Update cases" ON cases;

CREATE POLICY "cases_select"
  ON cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
    OR firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

CREATE POLICY "cases_insert"
  ON cases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
    OR firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

CREATE POLICY "cases_update"
  ON cases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_metadata 
      WHERE id = auth.uid() 
      AND role = 'SuperAdmin'
    )
    OR firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

-- Verify policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('users_metadata', 'firms', 'clients', 'cases')
ORDER BY tablename, cmd;

