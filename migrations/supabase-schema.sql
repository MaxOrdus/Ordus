-- ============================================
-- ORDUS DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- FIRMS TABLE (Multi-tenant)
-- ============================================
CREATE TABLE firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS METADATA TABLE
-- ============================================
CREATE TABLE users_metadata (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Lawyer', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator')),
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

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
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

-- ============================================
-- CASES TABLE
-- ============================================
CREATE TABLE cases (
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

-- ============================================
-- SABS CLAIMS TABLE
-- ============================================
CREATE TABLE sabs_claims (
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

-- ============================================
-- TORT CLAIMS TABLE
-- ============================================
CREATE TABLE tort_claims (
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

-- ============================================
-- DEFENDANTS TABLE
-- ============================================
CREATE TABLE defendants (
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

-- ============================================
-- DEADLINES TABLE
-- ============================================
CREATE TABLE deadlines (
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

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_user_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  assigned_to_role TEXT CHECK (assigned_to_role IN ('Lawyer', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator')),
  created_by_user_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL NOT NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Blocked', 'Cancelled')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  category TEXT NOT NULL CHECK (category IN (
    'OCF Forms', 'Discovery', 'Pleadings', 'Medical Records', 'Undertakings',
    'Settlement', 'LAT', 'Court', 'Client Communication', 'Administrative', 'Other'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT,
  mime_type TEXT,
  schedule TEXT CHECK (schedule IN ('A', 'B', 'C')), -- For Affidavit of Documents
  uploaded_by_user_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEDICAL PROVIDERS TABLE
-- ============================================
CREATE TABLE medical_providers (
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

-- ============================================
-- EXPERT REPORTS TABLE
-- ============================================
CREATE TABLE expert_reports (
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

-- ============================================
-- OCF-18 SUBMISSIONS TABLE
-- ============================================
CREATE TABLE ocf18_submissions (
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

-- ============================================
-- LAT APPLICATIONS TABLE
-- ============================================
CREATE TABLE lat_applications (
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

-- ============================================
-- UNDERTAKINGS TABLE
-- ============================================
CREATE TABLE undertakings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Plaintiff', 'Defense')),
  description TEXT NOT NULL,
  requested_date DATE NOT NULL,
  assigned_to TEXT, -- User ID or "Client"
  status TEXT NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Refused', 'Under Advisement', 'Answered', 'Served')),
  due_date DATE,
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISBURSEMENTS TABLE
-- ============================================
CREATE TABLE disbursements (
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

-- ============================================
-- SETTLEMENT OFFERS TABLE
-- ============================================
CREATE TABLE settlement_offers (
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

-- ============================================
-- TIME ENTRIES TABLE
-- ============================================
CREATE TABLE time_entries (
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

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE activity_logs (
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
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_cases_firm_id ON cases(firm_id);
CREATE INDEX idx_cases_client_id ON cases(client_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_stage ON cases(stage);
CREATE INDEX idx_tasks_firm_id ON tasks(firm_id);
CREATE INDEX idx_tasks_case_id ON tasks(case_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX idx_deadlines_status ON deadlines(status);
CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_firm_id ON documents(firm_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_case_id ON time_entries(case_id);
CREATE INDEX idx_activity_logs_firm_id ON activity_logs(firm_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- ============================================
-- FUNCTIONS FOR UPDATED_AT TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
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

