-- ============================================
-- ORDUS ROW LEVEL SECURITY (RLS) POLICIES
-- Run this AFTER the schema is created
-- ============================================

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabs_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE tort_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE defendants ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocf18_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lat_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE undertakings ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get user's firm_id
-- ============================================
CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS UUID AS $$
  SELECT firm_id FROM users_metadata WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- USERS_METADATA POLICIES
-- ============================================
-- Users can view their own metadata
CREATE POLICY "Users can view own metadata"
  ON users_metadata FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own metadata
CREATE POLICY "Users can update own metadata"
  ON users_metadata FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- FIRMS POLICIES
-- ============================================
-- Users can view their own firm
CREATE POLICY "Users can view own firm"
  ON firms FOR SELECT
  USING (id = get_user_firm_id());

-- ============================================
-- CLIENTS POLICIES
-- ============================================
-- Users can view clients in their firm
CREATE POLICY "Users can view firm clients"
  ON clients FOR SELECT
  USING (firm_id = get_user_firm_id());

-- Lawyers and Law Clerks can insert clients
CREATE POLICY "Lawyers and Clerks can create clients"
  ON clients FOR INSERT
  WITH CHECK (
    firm_id = get_user_firm_id() AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role IN ('Lawyer', 'LawClerk')
    )
  );

-- Lawyers and Law Clerks can update clients
CREATE POLICY "Lawyers and Clerks can update clients"
  ON clients FOR UPDATE
  USING (
    firm_id = get_user_firm_id() AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role IN ('Lawyer', 'LawClerk')
    )
  );

-- ============================================
-- CASES POLICIES
-- ============================================
-- Users can view cases in their firm
CREATE POLICY "Users can view firm cases"
  ON cases FOR SELECT
  USING (firm_id = get_user_firm_id());

-- Lawyers can create cases
CREATE POLICY "Lawyers can create cases"
  ON cases FOR INSERT
  WITH CHECK (
    firm_id = get_user_firm_id() AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role = 'Lawyer'
    )
  );

-- Lawyers and Law Clerks can update cases
CREATE POLICY "Lawyers and Clerks can update cases"
  ON cases FOR UPDATE
  USING (
    firm_id = get_user_firm_id() AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role IN ('Lawyer', 'LawClerk')
    )
  );

-- Only Lawyers can delete cases
CREATE POLICY "Only Lawyers can delete cases"
  ON cases FOR DELETE
  USING (
    firm_id = get_user_firm_id() AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role = 'Lawyer'
    )
  );

-- ============================================
-- SABS CLAIMS POLICIES
-- ============================================
CREATE POLICY "Users can view firm sabs claims"
  ON sabs_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = sabs_claims.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Users can manage firm sabs claims"
  ON sabs_claims FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = sabs_claims.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

-- ============================================
-- TORT CLAIMS POLICIES
-- ============================================
CREATE POLICY "Users can view firm tort claims"
  ON tort_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = tort_claims.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Users can manage firm tort claims"
  ON tort_claims FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = tort_claims.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

-- ============================================
-- TASKS POLICIES
-- ============================================
CREATE POLICY "Users can view firm tasks"
  ON tasks FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "Users can update assigned tasks"
  ON tasks FOR UPDATE
  USING (
    firm_id = get_user_firm_id() AND
    (
      assigned_to_user_id = auth.uid() OR
      created_by_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users_metadata
        WHERE id = auth.uid() AND role IN ('Lawyer', 'LawClerk')
      )
    )
  );

-- ============================================
-- DEADLINES POLICIES
-- ============================================
CREATE POLICY "Users can view firm deadlines"
  ON deadlines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = deadlines.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Users can manage firm deadlines"
  ON deadlines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = deadlines.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================
CREATE POLICY "Users can view firm documents"
  ON documents FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "Users can update firm documents"
  ON documents FOR UPDATE
  USING (firm_id = get_user_firm_id());

CREATE POLICY "Lawyers can delete documents"
  ON documents FOR DELETE
  USING (
    firm_id = get_user_firm_id() AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role = 'Lawyer'
    )
  );

-- ============================================
-- MEDICAL PROVIDERS POLICIES
-- ============================================
CREATE POLICY "Users can view firm medical providers"
  ON medical_providers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = medical_providers.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Users can manage firm medical providers"
  ON medical_providers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = medical_providers.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

-- ============================================
-- EXPERT REPORTS POLICIES
-- ============================================
CREATE POLICY "Users can view firm expert reports"
  ON expert_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = expert_reports.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Users can manage firm expert reports"
  ON expert_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = expert_reports.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

-- ============================================
-- OCF-18 SUBMISSIONS POLICIES
-- ============================================
CREATE POLICY "Users can view firm ocf18 submissions"
  ON ocf18_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sabs_claims
      JOIN cases ON cases.id = sabs_claims.case_id
      WHERE sabs_claims.id = ocf18_submissions.sabs_claim_id
      AND cases.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Users can manage firm ocf18 submissions"
  ON ocf18_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sabs_claims
      JOIN cases ON cases.id = sabs_claims.case_id
      WHERE sabs_claims.id = ocf18_submissions.sabs_claim_id
      AND cases.firm_id = get_user_firm_id()
    )
  );

-- ============================================
-- LAT APPLICATIONS POLICIES
-- ============================================
CREATE POLICY "Users can view firm lat applications"
  ON lat_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sabs_claims
      JOIN cases ON cases.id = sabs_claims.case_id
      WHERE sabs_claims.id = lat_applications.sabs_claim_id
      AND cases.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Users can manage firm lat applications"
  ON lat_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sabs_claims
      JOIN cases ON cases.id = sabs_claims.case_id
      WHERE sabs_claims.id = lat_applications.sabs_claim_id
      AND cases.firm_id = get_user_firm_id()
    )
  );

-- ============================================
-- UNDERTAKINGS POLICIES
-- ============================================
CREATE POLICY "Users can view firm undertakings"
  ON undertakings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = undertakings.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

CREATE POLICY "Users can manage firm undertakings"
  ON undertakings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = undertakings.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

-- ============================================
-- DISBURSEMENTS POLICIES
-- ============================================
CREATE POLICY "Users can view firm disbursements"
  ON disbursements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = disbursements.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

-- Only Lawyers and Law Clerks can manage disbursements
CREATE POLICY "Lawyers and Clerks can manage disbursements"
  ON disbursements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = disbursements.case_id AND cases.firm_id = get_user_firm_id()
    ) AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role IN ('Lawyer', 'LawClerk')
    )
  );

-- ============================================
-- SETTLEMENT OFFERS POLICIES
-- ============================================
CREATE POLICY "Users can view firm settlement offers"
  ON settlement_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = settlement_offers.case_id AND cases.firm_id = get_user_firm_id()
    )
  );

-- Only Lawyers can manage settlement offers
CREATE POLICY "Only Lawyers can manage settlement offers"
  ON settlement_offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = settlement_offers.case_id AND cases.firm_id = get_user_firm_id()
    ) AND
    EXISTS (
      SELECT 1 FROM users_metadata
      WHERE id = auth.uid() AND role = 'Lawyer'
    )
  );

-- ============================================
-- TIME ENTRIES POLICIES
-- ============================================
CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  USING (
    firm_id = get_user_firm_id() AND
    (user_id = auth.uid() OR
     EXISTS (
       SELECT 1 FROM users_metadata
       WHERE id = auth.uid() AND role IN ('Lawyer', 'LawClerk')
     ))
  );

CREATE POLICY "Users can create own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (
    firm_id = get_user_firm_id() AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can update own time entries"
  ON time_entries FOR UPDATE
  USING (
    firm_id = get_user_firm_id() AND
    user_id = auth.uid()
  );

-- ============================================
-- ACTIVITY LOGS POLICIES
-- ============================================
CREATE POLICY "Users can view firm activity logs"
  ON activity_logs FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

