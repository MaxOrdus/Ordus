-- Fix Case Insert Policy
-- Allow all firm members to create cases
-- (UI enforces that AB Coordinators/Clerks must assign a Lawyer or Paralegal)
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Lawyers can create cases" ON cases;
DROP POLICY IF EXISTS "Users can create cases in their firm" ON cases;
DROP POLICY IF EXISTS "Lawyers and Paralegals can create cases" ON cases;

-- Create policy: Any firm member can create cases in their firm
CREATE POLICY "Firm members can create cases"
  ON cases FOR INSERT
  WITH CHECK (
    firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );

-- Also ensure the SELECT policy allows users to see cases in their firm
DROP POLICY IF EXISTS "Users can view firm cases" ON cases;
DROP POLICY IF EXISTS "Users can view cases they have access to" ON cases;

CREATE POLICY "Users can view firm cases"
  ON cases FOR SELECT
  USING (
    firm_id = (SELECT firm_id FROM users_metadata WHERE id = auth.uid())
  );
