-- ============================================
-- ORDUS COMPLETE DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 2: CREATE ALL TABLES
-- ============================================

-- FIRMS
CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS METADATA
CREATE TABLE IF NOT EXISTS users_metadata (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Lawyer', 'Paralegal', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator', 'Admin', 'SuperAdmin')),
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  avatar TEXT,
  preferences JSONB DEFAULT '{
    "theme": "system",
    "notifications": {
      "email": true,
      "push": true,
      "criticalDeadlines": true,
      "treatmentGaps": true,
      "taskAssignments": true,
      "settlementOffers": true
    },
    "dashboard": {
      "showBillableStreak": true,
      "showCaseVelocity": true,
      "showRedZone": true,
      "showStalledCases": true
    }
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CASES
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date_of_loss DATE NOT NULL,
  date_opened DATE NOT NULL,
  limitation_date DATE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Stalled', 'Critical', 'Settled', 'Closed')),
  stage TEXT NOT NULL DEFAULT 'Intake' CHECK (stage IN ('Intake', 'SABS Application', 'Discovery', 'Set Down', 'Pre-Trial', 'Trial Ready', 'Mediation', 'Settled', 'Trial')),
  estimated_value DECIMAL(12, 2) DEFAULT 0,
  current_offer DECIMAL(12, 2),
  total_disbursements DECIMAL(12, 2) DEFAULT 0,
  notes TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CASE ACCESS (for granular permissions)
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

-- SABS CLAIMS
CREATE TABLE IF NOT EXISTS sabs_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notice_date DATE,
  ocf1_received_date DATE,
  ocf1_submitted_date DATE,
  ocf3_expiry_date DATE,
  ocf3_renewal_alert BOOLEAN DEFAULT FALSE,
  elected_benefit_type TEXT CHECK (elected_benefit_type IN ('IRB', 'NEB', 'Caregiver')),
  benefit_election JSONB,
  mig_status TEXT NOT NULL DEFAULT 'MIG' CHECK (mig_status IN ('MIG', 'Non-MIG', 'CAT')),
  mig_bust_status TEXT CHECK (mig_bust_status IN ('In Progress', 'Approved', 'Denied')),
  cat_status TEXT NOT NULL DEFAULT 'Not Assessed' CHECK (cat_status IN ('Not Assessed', 'Pending', 'Approved', 'Denied')),
  cat_application_date DATE,
  cat_assessment_date DATE,
  irb_paid DECIMAL(12, 2) DEFAULT 0,
  medical_paid DECIMAL(12, 2) DEFAULT 0,
  attendant_care_paid DECIMAL(12, 2) DEFAULT 0,
  total_paid DECIMAL(12, 2) DEFAULT 0,
  medical_rehab_limit DECIMAL(12, 2) DEFAULT 3500,
  attendant_care_limit DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TORT CLAIMS
CREATE TABLE IF NOT EXISTS tort_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL UNIQUE,
  limitation_date DATE NOT NULL,
  limitation_status TEXT NOT NULL DEFAULT 'Active' CHECK (limitation_status IN ('Active', 'Expired', 'Extended')),
  notice_of_intent_date DATE,
  statement_of_claim_issued DATE,
  statement_of_claim_served DATE,
  statement_of_defense_received DATE,
  discovery_date DATE,
  discovery_completed BOOLEAN DEFAULT FALSE,
  discovery_transcript_received DATE,
  trial_record_served DATE,
  set_down_date DATE,
  rule48_dismissal_date DATE,
  pre_trial_date DATE,
  pre_trial_brief_filed BOOLEAN DEFAULT FALSE,
  trial_date DATE,
  jury_notice_filed BOOLEAN DEFAULT FALSE,
  aod_drafted BOOLEAN DEFAULT FALSE,
  aod_served DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEFENDANTS
CREATE TABLE IF NOT EXISTS defendants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tort_claim_id UUID REFERENCES tort_claims(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Driver', 'Owner', 'Lessee')),
  insurance_company TEXT,
  policy_number TEXT,
  served BOOLEAN DEFAULT FALSE,
  served_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEADLINES
CREATE TABLE IF NOT EXISTS deadlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'SABS_NOTICE', 'OCF1_DEADLINE', 'OCF3_RENEWAL', 'OCF18_DEEMED_APPROVAL',
    'TORT_NOTICE', 'LIMITATION_PERIOD', 'LAT_LIMITATION', 'RULE48_DISMISSAL',
    'PRETRIAL_BRIEF', 'EXPERT_REPORT', 'RESPONDING_REPORT'
  )),
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Overdue', 'Missed')),
  auto_generated BOOLEAN DEFAULT FALSE,
  critical BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_user_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  assigned_to_role TEXT CHECK (assigned_to_role IN ('Lawyer', 'Paralegal', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator', 'Admin', 'SuperAdmin')),
  created_by_user_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Blocked', 'Cancelled')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  category TEXT NOT NULL DEFAULT 'Other' CHECK (category IN (
    'OCF Forms', 'Discovery', 'Pleadings', 'Medical Records', 'Undertakings',
    'Settlement', 'LAT', 'Court', 'Client Communication', 'Administrative', 'Other'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  schedule TEXT CHECK (schedule IN ('A', 'B', 'C')),
  uploaded_by_user_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEDICAL PROVIDERS
CREATE TABLE IF NOT EXISTS medical_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('GP', 'Specialist', 'Hospital', 'Clinic', 'Physio', 'Chiro', 'Other')),
  records_obtained BOOLEAN DEFAULT FALSE,
  last_record_date DATE,
  records_requested DATE,
  gap_detected BOOLEAN DEFAULT FALSE,
  gap_start_date DATE,
  gap_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPERT REPORTS
CREATE TABLE IF NOT EXISTS expert_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  expert_name TEXT NOT NULL,
  expert_type TEXT NOT NULL CHECK (expert_type IN ('Orthopedic', 'Neurological', 'Psychological', 'Vocational', 'Actuarial', 'Other')),
  retained_date DATE NOT NULL,
  records_sent_date DATE,
  assessment_date DATE,
  draft_received_date DATE,
  final_served_date DATE,
  status TEXT NOT NULL DEFAULT 'Retained' CHECK (status IN ('Retained', 'Records Sent', 'Assessment Scheduled', 'Draft Received', 'Final Served')),
  rule53_compliant BOOLEAN DEFAULT FALSE,
  pre_trial_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OCF-18 SUBMISSIONS
CREATE TABLE IF NOT EXISTS ocf18_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sabs_claim_id UUID REFERENCES sabs_claims(id) ON DELETE CASCADE NOT NULL,
  submission_date DATE NOT NULL,
  treatment_type TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Partially Approved', 'Denied', 'Deemed Approved')),
  response_date DATE,
  response_deadline DATE NOT NULL,
  deemed_approval_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LAT APPLICATIONS
CREATE TABLE IF NOT EXISTS lat_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sabs_claim_id UUID REFERENCES sabs_claims(id) ON DELETE CASCADE NOT NULL,
  denial_date DATE NOT NULL,
  denial_type TEXT NOT NULL,
  application_filed DATE,
  limitation_date DATE NOT NULL,
  case_conference_date DATE,
  hearing_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Filed', 'Settled', 'Hearing Scheduled', 'Completed')),
  denied_benefit_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNDERTAKINGS
CREATE TABLE IF NOT EXISTS undertakings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Plaintiff', 'Defense')),
  description TEXT NOT NULL,
  requested_date DATE NOT NULL,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Refused', 'Under Advisement', 'Answered', 'Served')),
  due_date DATE,
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DISBURSEMENTS
CREATE TABLE IF NOT EXISTS disbursements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Expert', 'Court Fees', 'Transcripts', 'Medical Records', 'Process Serving', 'Other')),
  assessable BOOLEAN DEFAULT TRUE,
  paid BOOLEAN DEFAULT FALSE,
  invoice_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTLEMENT OFFERS
CREATE TABLE IF NOT EXISTS settlement_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Plaintiff', 'Defendant')),
  gross_amount DECIMAL(12, 2) NOT NULL,
  net_amount DECIMAL(12, 2),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Accepted', 'Rejected', 'Countered')),
  expires_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TIME ENTRIES
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users_metadata(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hours DECIMAL(5, 2) NOT NULL,
  date DATE NOT NULL,
  billable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users_metadata(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'Created', 'Updated', 'Deleted', 'Viewed', 'Assigned', 'Completed',
    'Commented', 'Logged Time', 'Uploaded Document', 'Sent Email', 'Generated Report'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('Case', 'Task', 'Document', 'Client', 'User')),
  entity_id UUID NOT NULL,
  entity_title TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cases_firm_id ON cases(firm_id);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_stage ON cases(stage);
CREATE INDEX IF NOT EXISTS idx_tasks_firm_id ON tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_case_id ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_firm_id ON documents(firm_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_case_id ON time_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_firm_id ON activity_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_case_access_case_id ON case_access(case_id);
CREATE INDEX IF NOT EXISTS idx_case_access_user_id ON case_access(user_id);
CREATE INDEX IF NOT EXISTS idx_case_access_granted_by ON case_access(granted_by);

-- ============================================
-- STEP 4: CREATE FUNCTIONS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get user's firm_id (simple version without SECURITY DEFINER for now)
CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS UUID AS $$
  SELECT firm_id FROM users_metadata WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- STEP 5: CREATE TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_firms_updated_at ON firms;
DROP TRIGGER IF EXISTS update_users_metadata_updated_at ON users_metadata;
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
DROP TRIGGER IF EXISTS update_sabs_claims_updated_at ON sabs_claims;
DROP TRIGGER IF EXISTS update_tort_claims_updated_at ON tort_claims;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_medical_providers_updated_at ON medical_providers;
DROP TRIGGER IF EXISTS update_expert_reports_updated_at ON expert_reports;
DROP TRIGGER IF EXISTS update_ocf18_submissions_updated_at ON ocf18_submissions;
DROP TRIGGER IF EXISTS update_lat_applications_updated_at ON lat_applications;
DROP TRIGGER IF EXISTS update_undertakings_updated_at ON undertakings;
DROP TRIGGER IF EXISTS update_disbursements_updated_at ON disbursements;
DROP TRIGGER IF EXISTS update_settlement_offers_updated_at ON settlement_offers;
DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;

CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_metadata_updated_at BEFORE UPDATE ON users_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sabs_claims_updated_at BEFORE UPDATE ON sabs_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tort_claims_updated_at BEFORE UPDATE ON tort_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_providers_updated_at BEFORE UPDATE ON medical_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expert_reports_updated_at BEFORE UPDATE ON expert_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ocf18_submissions_updated_at BEFORE UPDATE ON ocf18_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lat_applications_updated_at BEFORE UPDATE ON lat_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_undertakings_updated_at BEFORE UPDATE ON undertakings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disbursements_updated_at BEFORE UPDATE ON disbursements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settlement_offers_updated_at BEFORE UPDATE ON settlement_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_access ENABLE ROW LEVEL SECURITY;
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
-- STEP 7: CREATE SIMPLE RLS POLICIES
-- (Firm-based access for all tables)
-- ============================================

-- USERS_METADATA POLICIES
DROP POLICY IF EXISTS "Users can view own metadata" ON users_metadata;
DROP POLICY IF EXISTS "Users can update own metadata" ON users_metadata;
DROP POLICY IF EXISTS "Users can view firm members" ON users_metadata;

CREATE POLICY "Users can view own metadata" ON users_metadata FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own metadata" ON users_metadata FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view firm members" ON users_metadata FOR SELECT USING (firm_id = get_user_firm_id());

-- FIRMS POLICIES
DROP POLICY IF EXISTS "Users can view own firm" ON firms;
CREATE POLICY "Users can view own firm" ON firms FOR SELECT USING (id = get_user_firm_id());

-- CLIENTS POLICIES
DROP POLICY IF EXISTS "Users can view firm clients" ON clients;
DROP POLICY IF EXISTS "Firm members can create clients" ON clients;
DROP POLICY IF EXISTS "Firm members can update clients" ON clients;

CREATE POLICY "Users can view firm clients" ON clients FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can create clients" ON clients FOR INSERT WITH CHECK (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can update clients" ON clients FOR UPDATE USING (firm_id = get_user_firm_id());

-- CASES POLICIES (simplified - all firm members can access)
DROP POLICY IF EXISTS "Users can view firm cases" ON cases;
DROP POLICY IF EXISTS "Firm members can create cases" ON cases;
DROP POLICY IF EXISTS "Firm members can update cases" ON cases;
DROP POLICY IF EXISTS "Firm members can delete cases" ON cases;

CREATE POLICY "Users can view firm cases" ON cases FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can create cases" ON cases FOR INSERT WITH CHECK (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can update cases" ON cases FOR UPDATE USING (firm_id = get_user_firm_id());
CREATE POLICY "Firm members can delete cases" ON cases FOR DELETE USING (firm_id = get_user_firm_id());

-- CASE_ACCESS POLICIES (simplified)
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

-- TASKS POLICIES
DROP POLICY IF EXISTS "Users can view firm tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;

CREATE POLICY "Users can view firm tasks" ON tasks FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Users can create tasks" ON tasks FOR INSERT WITH CHECK (firm_id = get_user_firm_id());
CREATE POLICY "Users can update tasks" ON tasks FOR UPDATE USING (firm_id = get_user_firm_id());

-- DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Users can view firm documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can update firm documents" ON documents;

CREATE POLICY "Users can view firm documents" ON documents FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Users can upload documents" ON documents FOR INSERT WITH CHECK (firm_id = get_user_firm_id());
CREATE POLICY "Users can update firm documents" ON documents FOR UPDATE USING (firm_id = get_user_firm_id());

-- SABS CLAIMS POLICIES
DROP POLICY IF EXISTS "Users can view firm sabs claims" ON sabs_claims;
DROP POLICY IF EXISTS "Users can manage firm sabs claims" ON sabs_claims;

CREATE POLICY "Users can view firm sabs claims" ON sabs_claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = sabs_claims.case_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm sabs claims" ON sabs_claims FOR ALL
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = sabs_claims.case_id AND cases.firm_id = get_user_firm_id()));

-- TORT CLAIMS POLICIES
DROP POLICY IF EXISTS "Users can view firm tort claims" ON tort_claims;
DROP POLICY IF EXISTS "Users can manage firm tort claims" ON tort_claims;

CREATE POLICY "Users can view firm tort claims" ON tort_claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = tort_claims.case_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm tort claims" ON tort_claims FOR ALL
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = tort_claims.case_id AND cases.firm_id = get_user_firm_id()));

-- DEADLINES POLICIES
DROP POLICY IF EXISTS "Users can view firm deadlines" ON deadlines;
DROP POLICY IF EXISTS "Users can manage firm deadlines" ON deadlines;

CREATE POLICY "Users can view firm deadlines" ON deadlines FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = deadlines.case_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm deadlines" ON deadlines FOR ALL
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = deadlines.case_id AND cases.firm_id = get_user_firm_id()));

-- TIME ENTRIES POLICIES
DROP POLICY IF EXISTS "Users can view firm time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update time entries" ON time_entries;

CREATE POLICY "Users can view firm time entries" ON time_entries FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Users can create time entries" ON time_entries FOR INSERT WITH CHECK (firm_id = get_user_firm_id());
CREATE POLICY "Users can update time entries" ON time_entries FOR UPDATE USING (firm_id = get_user_firm_id());

-- ACTIVITY LOGS POLICIES
DROP POLICY IF EXISTS "Users can view firm activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;

CREATE POLICY "Users can view firm activity logs" ON activity_logs FOR SELECT USING (firm_id = get_user_firm_id());
CREATE POLICY "Users can insert activity logs" ON activity_logs FOR INSERT WITH CHECK (firm_id = get_user_firm_id());

-- MEDICAL PROVIDERS POLICIES
DROP POLICY IF EXISTS "Users can view firm medical providers" ON medical_providers;
DROP POLICY IF EXISTS "Users can manage firm medical providers" ON medical_providers;

CREATE POLICY "Users can view firm medical providers" ON medical_providers FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = medical_providers.case_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm medical providers" ON medical_providers FOR ALL
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = medical_providers.case_id AND cases.firm_id = get_user_firm_id()));

-- EXPERT REPORTS POLICIES
DROP POLICY IF EXISTS "Users can view firm expert reports" ON expert_reports;
DROP POLICY IF EXISTS "Users can manage firm expert reports" ON expert_reports;

CREATE POLICY "Users can view firm expert reports" ON expert_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = expert_reports.case_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm expert reports" ON expert_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = expert_reports.case_id AND cases.firm_id = get_user_firm_id()));

-- OCF-18 SUBMISSIONS POLICIES
DROP POLICY IF EXISTS "Users can view firm ocf18 submissions" ON ocf18_submissions;
DROP POLICY IF EXISTS "Users can manage firm ocf18 submissions" ON ocf18_submissions;

CREATE POLICY "Users can view firm ocf18 submissions" ON ocf18_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM sabs_claims JOIN cases ON cases.id = sabs_claims.case_id WHERE sabs_claims.id = ocf18_submissions.sabs_claim_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm ocf18 submissions" ON ocf18_submissions FOR ALL
  USING (EXISTS (SELECT 1 FROM sabs_claims JOIN cases ON cases.id = sabs_claims.case_id WHERE sabs_claims.id = ocf18_submissions.sabs_claim_id AND cases.firm_id = get_user_firm_id()));

-- LAT APPLICATIONS POLICIES
DROP POLICY IF EXISTS "Users can view firm lat applications" ON lat_applications;
DROP POLICY IF EXISTS "Users can manage firm lat applications" ON lat_applications;

CREATE POLICY "Users can view firm lat applications" ON lat_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM sabs_claims JOIN cases ON cases.id = sabs_claims.case_id WHERE sabs_claims.id = lat_applications.sabs_claim_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm lat applications" ON lat_applications FOR ALL
  USING (EXISTS (SELECT 1 FROM sabs_claims JOIN cases ON cases.id = sabs_claims.case_id WHERE sabs_claims.id = lat_applications.sabs_claim_id AND cases.firm_id = get_user_firm_id()));

-- UNDERTAKINGS POLICIES
DROP POLICY IF EXISTS "Users can view firm undertakings" ON undertakings;
DROP POLICY IF EXISTS "Users can manage firm undertakings" ON undertakings;

CREATE POLICY "Users can view firm undertakings" ON undertakings FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = undertakings.case_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm undertakings" ON undertakings FOR ALL
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = undertakings.case_id AND cases.firm_id = get_user_firm_id()));

-- DISBURSEMENTS POLICIES
DROP POLICY IF EXISTS "Users can view firm disbursements" ON disbursements;
DROP POLICY IF EXISTS "Users can manage firm disbursements" ON disbursements;

CREATE POLICY "Users can view firm disbursements" ON disbursements FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = disbursements.case_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm disbursements" ON disbursements FOR ALL
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = disbursements.case_id AND cases.firm_id = get_user_firm_id()));

-- SETTLEMENT OFFERS POLICIES
DROP POLICY IF EXISTS "Users can view firm settlement offers" ON settlement_offers;
DROP POLICY IF EXISTS "Users can manage firm settlement offers" ON settlement_offers;

CREATE POLICY "Users can view firm settlement offers" ON settlement_offers FOR SELECT
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = settlement_offers.case_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm settlement offers" ON settlement_offers FOR ALL
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = settlement_offers.case_id AND cases.firm_id = get_user_firm_id()));

-- DEFENDANTS POLICIES
DROP POLICY IF EXISTS "Users can view firm defendants" ON defendants;
DROP POLICY IF EXISTS "Users can manage firm defendants" ON defendants;

CREATE POLICY "Users can view firm defendants" ON defendants FOR SELECT
  USING (EXISTS (SELECT 1 FROM tort_claims JOIN cases ON cases.id = tort_claims.case_id WHERE tort_claims.id = defendants.tort_claim_id AND cases.firm_id = get_user_firm_id()));
CREATE POLICY "Users can manage firm defendants" ON defendants FOR ALL
  USING (EXISTS (SELECT 1 FROM tort_claims JOIN cases ON cases.id = tort_claims.case_id WHERE tort_claims.id = defendants.tort_claim_id AND cases.firm_id = get_user_firm_id()));

-- ============================================
-- DONE!
-- ============================================
