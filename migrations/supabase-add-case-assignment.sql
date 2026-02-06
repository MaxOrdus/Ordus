-- ============================================
-- ADD CASE ASSIGNMENT FIELDS
-- Run this to add lawyer/team assignment to cases
-- ============================================

-- Add primary lawyer assignment
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS primary_lawyer_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL;

-- Add supporting team members (array of user IDs)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS assigned_team_members UUID[] DEFAULT ARRAY[]::UUID[];

-- Add paralegal assignment (for SABS work)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS assigned_paralegal_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_cases_primary_lawyer ON cases(primary_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_paralegal ON cases(assigned_paralegal_id);

-- Add comment for documentation
COMMENT ON COLUMN cases.primary_lawyer_id IS 'Primary lawyer responsible for the case (Senior or Junior Lawyer)';
COMMENT ON COLUMN cases.assigned_team_members IS 'Array of user IDs for supporting team members (clerks, junior lawyers, etc.)';
COMMENT ON COLUMN cases.assigned_paralegal_id IS 'Paralegal assigned to handle SABS work for this case';

