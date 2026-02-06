-- Case Access Control Migration
-- This implements granular case/file access control:
-- 1. Creator has access by default
-- 2. Firm Admin always has access
-- 3. Users can share with team members
-- 4. Admins can grant access to anyone in the firm

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS case_access CASCADE;

-- Create case_access table for tracking who has access to which cases
CREATE TABLE case_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_metadata(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES users_metadata(id),
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'edit', 'full')),
  -- view = can see case details, documents
  -- edit = can modify case, add documents, tasks
  -- full = can share with others, delete documents
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one access entry per case
  UNIQUE(case_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_case_access_case_id ON case_access(case_id);
CREATE INDEX idx_case_access_user_id ON case_access(user_id);
CREATE INDEX idx_case_access_granted_by ON case_access(granted_by);

-- Function to check if a user has access to a case
CREATE OR REPLACE FUNCTION user_has_case_access(p_user_id UUID, p_case_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_user_firm_id UUID;
  v_case_firm_id UUID;
BEGIN
  -- Get user's role and firm
  SELECT role, firm_id INTO v_user_role, v_user_firm_id
  FROM users_metadata
  WHERE id = p_user_id;

  -- Get case's firm
  SELECT firm_id INTO v_case_firm_id
  FROM cases
  WHERE id = p_case_id;

  -- SuperAdmin has access to everything
  IF v_user_role = 'SuperAdmin' THEN
    RETURN TRUE;
  END IF;

  -- Must be in the same firm
  IF v_user_firm_id IS NULL OR v_user_firm_id != v_case_firm_id THEN
    RETURN FALSE;
  END IF;

  -- Firm Admin has access to all cases in their firm
  IF v_user_role = 'Admin' THEN
    RETURN TRUE;
  END IF;

  -- Check case_access table for explicit access
  RETURN EXISTS (
    SELECT 1 FROM case_access
    WHERE case_id = p_case_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's access level for a case
CREATE OR REPLACE FUNCTION get_case_access_level(p_user_id UUID, p_case_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_user_role TEXT;
  v_user_firm_id UUID;
  v_case_firm_id UUID;
  v_access_level TEXT;
BEGIN
  -- Get user's role and firm
  SELECT role, firm_id INTO v_user_role, v_user_firm_id
  FROM users_metadata
  WHERE id = p_user_id;

  -- Get case's firm
  SELECT firm_id INTO v_case_firm_id
  FROM cases
  WHERE id = p_case_id;

  -- SuperAdmin has full access
  IF v_user_role = 'SuperAdmin' THEN
    RETURN 'full';
  END IF;

  -- Must be in the same firm
  IF v_user_firm_id IS NULL OR v_user_firm_id != v_case_firm_id THEN
    RETURN NULL;
  END IF;

  -- Firm Admin has full access to all cases in their firm
  IF v_user_role = 'Admin' THEN
    RETURN 'full';
  END IF;

  -- Check case_access table
  SELECT access_level INTO v_access_level
  FROM case_access
  WHERE case_id = p_case_id AND user_id = p_user_id;

  RETURN v_access_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically grant creator access when a case is created
CREATE OR REPLACE FUNCTION grant_creator_case_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Grant full access to the creator
  INSERT INTO case_access (case_id, user_id, granted_by, access_level, is_creator)
  VALUES (NEW.id, auth.uid(), auth.uid(), 'full', true)
  ON CONFLICT (case_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-grant access on case creation
DROP TRIGGER IF EXISTS trigger_grant_creator_access ON cases;
CREATE TRIGGER trigger_grant_creator_access
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION grant_creator_case_access();

-- RLS Policies for case_access table
ALTER TABLE case_access ENABLE ROW LEVEL SECURITY;

-- Users can view access records for cases they have access to
CREATE POLICY "Users can view case access for their accessible cases"
  ON case_access FOR SELECT
  USING (
    user_has_case_access(auth.uid(), case_id)
  );

-- Users with 'full' access can grant access to others
CREATE POLICY "Users with full access can grant access"
  ON case_access FOR INSERT
  WITH CHECK (
    get_case_access_level(auth.uid(), case_id) = 'full'
  );

-- Users with 'full' access can update access levels
CREATE POLICY "Users with full access can update access"
  ON case_access FOR UPDATE
  USING (
    get_case_access_level(auth.uid(), case_id) = 'full'
  );

-- Users with 'full' access can revoke access (but not their own if they're creator)
CREATE POLICY "Users with full access can revoke access"
  ON case_access FOR DELETE
  USING (
    get_case_access_level(auth.uid(), case_id) = 'full'
    AND NOT (user_id = auth.uid() AND is_creator = true)
  );

-- Update the cases RLS policy to use case_access
-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view cases in their firm" ON cases;
DROP POLICY IF EXISTS "Users can view their firm cases" ON cases;
DROP POLICY IF EXISTS "firm_cases_select" ON cases;

-- New policy: Users can only view cases they have access to
CREATE POLICY "Users can view cases they have access to"
  ON cases FOR SELECT
  USING (
    user_has_case_access(auth.uid(), id)
  );

-- Update policy for editing cases
DROP POLICY IF EXISTS "Users can update cases in their firm" ON cases;
DROP POLICY IF EXISTS "Users can update their firm cases" ON cases;
DROP POLICY IF EXISTS "firm_cases_update" ON cases;

CREATE POLICY "Users can update cases they have edit access to"
  ON cases FOR UPDATE
  USING (
    get_case_access_level(auth.uid(), id) IN ('edit', 'full')
  );

-- Insert policy remains firm-based (anyone in firm can create a case)
DROP POLICY IF EXISTS "Users can insert cases in their firm" ON cases;
DROP POLICY IF EXISTS "Users can create cases in their firm" ON cases;
DROP POLICY IF EXISTS "firm_cases_insert" ON cases;

CREATE POLICY "Users can create cases in their firm"
  ON cases FOR INSERT
  WITH CHECK (
    firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users_metadata WHERE id = auth.uid() AND role = 'SuperAdmin')
  );

-- Delete policy: only full access
DROP POLICY IF EXISTS "Users can delete cases in their firm" ON cases;
DROP POLICY IF EXISTS "firm_cases_delete" ON cases;

CREATE POLICY "Users can delete cases they have full access to"
  ON cases FOR DELETE
  USING (
    get_case_access_level(auth.uid(), id) = 'full'
  );

-- Update documents RLS to also respect case access
DROP POLICY IF EXISTS "Users can view documents in their firm" ON documents;
DROP POLICY IF EXISTS "firm_documents_select" ON documents;

CREATE POLICY "Users can view documents for cases they have access to"
  ON documents FOR SELECT
  USING (
    -- Document without case_id: check firm membership
    (case_id IS NULL AND firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid()))
    OR
    -- Document with case_id: check case access
    (case_id IS NOT NULL AND user_has_case_access(auth.uid(), case_id))
    OR
    -- SuperAdmin sees all
    EXISTS (SELECT 1 FROM users_metadata WHERE id = auth.uid() AND role = 'SuperAdmin')
  );

-- Comment for documentation
COMMENT ON TABLE case_access IS 'Tracks granular access control for cases. Creator gets automatic full access. Admins have implicit full access. Others need explicit grants.';
COMMENT ON COLUMN case_access.access_level IS 'view = read-only, edit = can modify, full = can share and delete';
