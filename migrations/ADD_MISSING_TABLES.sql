-- ============================================
-- ADD MISSING TABLES AND POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE CASE_ACCESS TABLE (missing)
-- ============================================
CREATE TABLE IF NOT EXISTS case_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_metadata(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES users_metadata(id),
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'edit', 'full')),
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id, user_id)
);

-- Index for case_access
CREATE INDEX IF NOT EXISTS idx_case_access_case_id ON case_access(case_id);
CREATE INDEX IF NOT EXISTS idx_case_access_user_id ON case_access(user_id);

-- Enable RLS
ALTER TABLE case_access ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. ENSURE get_user_firm_id FUNCTION EXISTS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS UUID AS $$
  SELECT firm_id FROM users_metadata WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 3. RLS POLICY FOR CASE_ACCESS
-- ============================================
DROP POLICY IF EXISTS "Users can view case access" ON case_access;
DROP POLICY IF EXISTS "Users can insert case access" ON case_access;
DROP POLICY IF EXISTS "Users can update case access" ON case_access;
DROP POLICY IF EXISTS "Users can delete case access" ON case_access;

CREATE POLICY "Users can view case access" ON case_access FOR SELECT USING (
  EXISTS (SELECT 1 FROM cases WHERE cases.id = case_access.case_id AND cases.firm_id = get_user_firm_id())
);
CREATE POLICY "Users can insert case access" ON case_access FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM cases WHERE cases.id = case_access.case_id AND cases.firm_id = get_user_firm_id())
);
CREATE POLICY "Users can update case access" ON case_access FOR UPDATE USING (
  EXISTS (SELECT 1 FROM cases WHERE cases.id = case_access.case_id AND cases.firm_id = get_user_firm_id())
);
CREATE POLICY "Users can delete case access" ON case_access FOR DELETE USING (
  EXISTS (SELECT 1 FROM cases WHERE cases.id = case_access.case_id AND cases.firm_id = get_user_firm_id())
);

-- ============================================
-- 4. FIX CASES RLS POLICIES (ensure all firm members can create)
-- ============================================
DROP POLICY IF EXISTS "Users can view firm cases" ON cases;
DROP POLICY IF EXISTS "Firm members can create cases" ON cases;
DROP POLICY IF EXISTS "Firm members can update cases" ON cases;
DROP POLICY IF EXISTS "Firm members can delete cases" ON cases;
DROP POLICY IF EXISTS "Lawyers can create cases" ON cases;
DROP POLICY IF EXISTS "Users can create cases in their firm" ON cases;

CREATE POLICY "Users can view firm cases" ON cases FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can create cases" ON cases FOR INSERT WITH CHECK (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can update cases" ON cases FOR UPDATE USING (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can delete cases" ON cases FOR DELETE USING (firm_id = get_user_firm_id());

-- ============================================
-- 5. FIX TASKS RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view firm tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON tasks;

CREATE POLICY "Users can view firm tasks" ON tasks FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Users can create tasks" ON tasks FOR INSERT WITH CHECK (firm_id = get_user_firm_id());
CREATE POLICY "Users can update tasks" ON tasks FOR UPDATE USING (firm_id = get_user_firm_id());

-- ============================================
-- 6. FIX CLIENTS RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view firm clients" ON clients;
DROP POLICY IF EXISTS "Firm members can create clients" ON clients;
DROP POLICY IF EXISTS "Firm members can update clients" ON clients;
DROP POLICY IF EXISTS "Lawyers and Clerks can create clients" ON clients;

CREATE POLICY "Users can view firm clients" ON clients FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can create clients" ON clients FOR INSERT WITH CHECK (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can update clients" ON clients FOR UPDATE USING (firm_id = get_user_firm_id());

-- ============================================
-- DONE!
-- ============================================
