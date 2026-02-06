-- Case Tracking Table
-- Stores opening memo completion and client review tracking data

CREATE TABLE IF NOT EXISTS case_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Opening Memo Tracking
  opening_memo_completed BOOLEAN DEFAULT FALSE,
  opening_memo_entries JSONB DEFAULT '[]'::jsonb,

  -- Client Review Tracking
  last_review_date DATE,
  next_review_date DATE,
  review_entries JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each case should have only one tracking record
  UNIQUE(case_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_case_tracking_case_id ON case_tracking(case_id);
CREATE INDEX IF NOT EXISTS idx_case_tracking_next_review ON case_tracking(next_review_date) WHERE next_review_date IS NOT NULL;

-- Enable RLS
ALTER TABLE case_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can access tracking for cases they have access to)
CREATE POLICY "Users can view case tracking for their cases"
  ON case_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_tracking.case_id
      AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
    )
  );

CREATE POLICY "Users can insert case tracking for their cases"
  ON case_tracking FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_tracking.case_id
      AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
    )
  );

CREATE POLICY "Users can update case tracking for their cases"
  ON case_tracking FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_tracking.case_id
      AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_case_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS case_tracking_updated_at ON case_tracking;
CREATE TRIGGER case_tracking_updated_at
  BEFORE UPDATE ON case_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_case_tracking_updated_at();
