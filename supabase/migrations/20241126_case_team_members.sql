-- Case Team Members Table
-- Tracks who is assigned to each case and their role on that case

-- Add lead_lawyer_id and paralegal_id to cases table for quick access
ALTER TABLE cases ADD COLUMN IF NOT EXISTS lead_lawyer_id UUID REFERENCES auth.users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS paralegal_id UUID REFERENCES auth.users(id);

-- Create case_team_members table
CREATE TABLE IF NOT EXISTS case_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_role TEXT NOT NULL CHECK (team_role IN ('lead_lawyer', 'paralegal', 'team_member')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only be on a case once
  UNIQUE(case_id, user_id)
);

-- Enable RLS
ALTER TABLE case_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view team members for cases in their firm
CREATE POLICY "Users can view team members for their firm's cases"
  ON case_team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN users_metadata um ON um.firm_id = c.firm_id
      WHERE c.id = case_team_members.case_id
      AND um.id = auth.uid()
    )
  );

-- RLS Policy: Admins and lead lawyers can manage team members
CREATE POLICY "Admins and leads can manage team members"
  ON case_team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN users_metadata um ON um.firm_id = c.firm_id
      WHERE c.id = case_team_members.case_id
      AND um.id = auth.uid()
      AND (
        um.role IN ('SuperAdmin', 'Admin')
        OR c.lead_lawyer_id = auth.uid()
        OR c.paralegal_id = auth.uid()
      )
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_team_members_case_id ON case_team_members(case_id);
CREATE INDEX IF NOT EXISTS idx_case_team_members_user_id ON case_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_lead_lawyer_id ON cases(lead_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_paralegal_id ON cases(paralegal_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_case_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_team_members_updated_at
  BEFORE UPDATE ON case_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_case_team_members_updated_at();

-- Function to check if user is lead on any case (for dashboard selection)
CREATE OR REPLACE FUNCTION is_user_lead_on_any_case(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM cases
    WHERE lead_lawyer_id = user_uuid
    OR paralegal_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
