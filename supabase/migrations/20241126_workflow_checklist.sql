-- Workflow Checklist Table
-- Stores user completions for SABS workflow checklist items

CREATE TABLE IF NOT EXISTS workflow_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique item per case
  UNIQUE(case_id, item_id)
);

-- Enable RLS
ALTER TABLE workflow_checklist ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view checklist items for cases in their firm
CREATE POLICY "Users can view checklist for their firm's cases"
  ON workflow_checklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN users_metadata um ON um.firm_id = c.firm_id
      WHERE c.id = workflow_checklist.case_id
      AND um.id = auth.uid()
    )
  );

-- RLS Policy: Users can insert/update checklist items for cases in their firm
CREATE POLICY "Users can modify checklist for their firm's cases"
  ON workflow_checklist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN users_metadata um ON um.firm_id = c.firm_id
      WHERE c.id = workflow_checklist.case_id
      AND um.id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_workflow_checklist_case_id ON workflow_checklist(case_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_workflow_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_checklist_updated_at
  BEFORE UPDATE ON workflow_checklist
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_checklist_updated_at();
