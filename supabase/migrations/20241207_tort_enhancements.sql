-- Tort Claims Enhancements
-- Adds trial outcome, jury notice date, and pre-trial checklist fields

-- Add new columns to tort_claims table
ALTER TABLE tort_claims
ADD COLUMN IF NOT EXISTS jury_notice_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_outcome JSONB,
ADD COLUMN IF NOT EXISTS pretrial_checklist_progress JSONB DEFAULT '{}';

-- Add comment explaining the trial_outcome JSONB structure
COMMENT ON COLUMN tort_claims.trial_outcome IS 'JSON object containing: result (Plaintiff Verdict|Defense Verdict|Settled at Trial|Mistrial|Dismissed), judgmentDate, judgmentAmount, costsAwarded, interestAwarded, totalJudgment, appealFiled, appealDate, appealStatus, notes';

-- Add comment explaining the pretrial_checklist_progress JSONB structure
COMMENT ON COLUMN tort_claims.pretrial_checklist_progress IS 'JSON object mapping checklist item IDs to completion status (boolean)';

-- Create index for cases that have trial outcomes (for reporting)
CREATE INDEX IF NOT EXISTS idx_tort_claims_trial_outcome ON tort_claims USING GIN (trial_outcome) WHERE trial_outcome IS NOT NULL;

-- Note: The defendants table should already exist from COMPLETE_DATABASE_SETUP.sql
-- If it doesn't exist, run the following:
--
-- CREATE TABLE IF NOT EXISTS defendants (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
--   name TEXT NOT NULL,
--   role TEXT NOT NULL CHECK (role IN ('Driver', 'Owner', 'Lessee')),
--   insurance_company TEXT NOT NULL,
--   policy_number TEXT,
--   served BOOLEAN DEFAULT false,
--   served_date TIMESTAMPTZ,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_defendants_case_id ON defendants(case_id);
--
-- ALTER TABLE defendants ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Users can view defendants for their cases"
--   ON defendants FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM cases c
--       WHERE c.id = defendants.case_id
--       AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
--     )
--   );
--
-- CREATE POLICY "Users can insert defendants for their cases"
--   ON defendants FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM cases c
--       WHERE c.id = defendants.case_id
--       AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
--     )
--   );
--
-- CREATE POLICY "Users can update defendants for their cases"
--   ON defendants FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM cases c
--       WHERE c.id = defendants.case_id
--       AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
--     )
--   );
--
-- CREATE POLICY "Users can delete defendants for their cases"
--   ON defendants FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM cases c
--       WHERE c.id = defendants.case_id
--       AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
--     )
--   );
