-- Undertakings Table
-- Tracks plaintiff and defense undertakings for cases

CREATE TABLE IF NOT EXISTS undertakings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Undertaking details
  type TEXT NOT NULL CHECK (type IN ('Plaintiff', 'Defense')),
  description TEXT NOT NULL,
  requested_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Answered', 'Served', 'Refused', 'Under Advisement')),
  assigned_to TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_undertakings_case_id ON undertakings(case_id);
CREATE INDEX IF NOT EXISTS idx_undertakings_type ON undertakings(type);
CREATE INDEX IF NOT EXISTS idx_undertakings_status ON undertakings(status);

-- Enable RLS
ALTER TABLE undertakings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can access undertakings for cases they have access to)
CREATE POLICY "Users can view undertakings for their cases"
  ON undertakings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = undertakings.case_id
      AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
    )
  );

CREATE POLICY "Users can insert undertakings for their cases"
  ON undertakings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = undertakings.case_id
      AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
    )
  );

CREATE POLICY "Users can update undertakings for their cases"
  ON undertakings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = undertakings.case_id
      AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
    )
  );

CREATE POLICY "Users can delete undertakings for their cases"
  ON undertakings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = undertakings.case_id
      AND (c.firm_id = auth.jwt() ->> 'firm_id' OR c.firm_id IS NULL)
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_undertakings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS undertakings_updated_at ON undertakings;
CREATE TRIGGER undertakings_updated_at
  BEFORE UPDATE ON undertakings
  FOR EACH ROW
  EXECUTE FUNCTION update_undertakings_updated_at();
