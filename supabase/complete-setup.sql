-- ============================================
-- ORDUS COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor (in order)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. FIRMS TABLE (Multi-tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USERS METADATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users_metadata (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SuperAdmin', 'Admin', 'Lawyer', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator', 'Paralegal')),
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
-- 3. CLIENTS TABLE
-- ============================================
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

-- ============================================
-- 4. CASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  primary_lawyer_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  assigned_paralegal_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  assigned_team_members UUID[] DEFAULT ARRAY[]::UUID[],
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

-- Indexes for cases
CREATE INDEX IF NOT EXISTS idx_cases_firm_id ON cases(firm_id);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_primary_lawyer ON cases(primary_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_paralegal ON cases(assigned_paralegal_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- ============================================
-- 5. SABS CLAIMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sabs_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notice_date DATE,
  ocf1_received_date DATE,
  ocf1_submitted_date DATE,
  ocf3_expiry_date DATE,
  ocf3_renewal_alert BOOLEAN DEFAULT FALSE,
  elected_benefit_type TEXT CHECK (elected_benefit_type IN ('IRB', 'NEB', 'Caregiver')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sabs_claims_case_id ON sabs_claims(case_id);

-- ============================================
-- 6. CASE TEAM MEMBERS (Junction Table)
-- ============================================
CREATE TABLE IF NOT EXISTS case_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users_metadata(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('LeadLawyer', 'Paralegal', 'LawClerk', 'LegalAssistant', 'ABCoordinator')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_case_team_case_id ON case_team_members(case_id);
CREATE INDEX IF NOT EXISTS idx_case_team_user_id ON case_team_members(user_id);

-- ============================================
-- 7. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'InProgress', 'Completed', 'Cancelled')),
  category TEXT CHECK (category IN ('Deadline', 'Document', 'Communication', 'Research', 'Court', 'SABS', 'Tort', 'General')),
  created_by UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_firm_id ON tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_case_id ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- ============================================
-- 8. LAT APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lat_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  denial_date DATE NOT NULL,
  denial_type TEXT NOT NULL,
  application_filed DATE,
  limitation_date DATE NOT NULL,
  case_conference_date DATE,
  hearing_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Filed', 'Settled', 'Hearing Scheduled', 'Completed')),
  denied_benefit_value DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lat_applications_case_id ON lat_applications(case_id);

-- ============================================
-- 9. OCF-18 SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ocf18_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  submission_date DATE NOT NULL,
  treatment_type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Partially Approved', 'Denied', 'Deemed Approved')),
  response_date DATE,
  response_deadline DATE NOT NULL,
  deemed_approval_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocf18_submissions_case_id ON ocf18_submissions(case_id);

-- ============================================
-- 10. EXPERT REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expert_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  expert_name TEXT NOT NULL,
  expert_type TEXT CHECK (expert_type IN ('Orthopedic', 'Neurological', 'Psychological', 'Vocational', 'Actuarial', 'Other')),
  retained_date DATE NOT NULL,
  assessment_date DATE,
  draft_received_date DATE,
  final_served_date DATE,
  status TEXT NOT NULL DEFAULT 'Retained' CHECK (status IN ('Retained', 'Records Sent', 'Assessment Scheduled', 'Draft Received', 'Final Served')),
  rule53_compliant BOOLEAN DEFAULT FALSE,
  pre_trial_deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_reports_case_id ON expert_reports(case_id);

-- ============================================
-- 11. SETTLEMENT OFFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settlement_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  offer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(12,2) NOT NULL,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('Plaintiff', 'Defendant')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Accepted', 'Rejected', 'Countered')),
  net_amount DECIMAL(12,2),
  notes TEXT,
  expires_date DATE,
  created_by UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_offers_case_id ON settlement_offers(case_id);

-- ============================================
-- 12. MEDICAL PROVIDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS medical_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  last_record_date DATE,
  records_obtained BOOLEAN DEFAULT FALSE,
  gap_detected BOOLEAN DEFAULT FALSE,
  gap_start_date DATE,
  gap_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_providers_case_id ON medical_providers(case_id);

-- ============================================
-- 13. UNDERTAKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS undertakings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  given_by UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  given_to TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Overdue')),
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_undertakings_case_id ON undertakings(case_id);

-- ============================================
-- 14. DISBURSEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS disbursements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date_incurred DATE NOT NULL,
  category TEXT CHECK (category IN ('MedicalRecords', 'ExpertFees', 'CourtFees', 'Travel', 'Research', 'Other')),
  receipt_url TEXT,
  created_by UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursements_case_id ON disbursements(case_id);

-- ============================================
-- 15. COMMUNICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('Email', 'Phone', 'Meeting', 'Letter', 'Text')),
  subject TEXT,
  content TEXT,
  participants TEXT[],
  communication_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users_metadata(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communications_case_id ON communications(case_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabs_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lat_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocf18_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE undertakings ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can view/edit their own metadata
CREATE POLICY "Users can view own metadata" ON users_metadata
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own metadata" ON users_metadata
  FOR UPDATE USING (id = auth.uid());

-- Firm members can view other users in their firm
CREATE POLICY "Firm members can view firm users" ON users_metadata
  FOR SELECT USING (firm_id IN (
    SELECT firm_id FROM users_metadata WHERE id = auth.uid()
  ));

-- Users can access data for their firm's cases
CREATE POLICY "Users can access firm cases" ON cases
  FOR ALL USING (firm_id IN (
    SELECT firm_id FROM users_metadata WHERE id = auth.uid()
  ));

CREATE POLICY "Users can access firm clients" ON clients
  FOR ALL USING (firm_id IN (
    SELECT firm_id FROM users_metadata WHERE id = auth.uid()
  ));

CREATE POLICY "Users can access firm tasks" ON tasks
  FOR ALL USING (firm_id IN (
    SELECT firm_id FROM users_metadata WHERE id = auth.uid()
  ));

-- Case-related data policies
CREATE POLICY "Users can access case lat_applications" ON lat_applications
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access case ocf18" ON ocf18_submissions
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access case experts" ON expert_reports
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access case settlements" ON settlement_offers
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access case medical providers" ON medical_providers
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access case undertakings" ON undertakings
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access case disbursements" ON disbursements
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access case communications" ON communications
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access case team members" ON case_team_members
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access sabs claims" ON sabs_claims
  FOR ALL USING (case_id IN (
    SELECT id FROM cases WHERE firm_id IN (
      SELECT firm_id FROM users_metadata WHERE id = auth.uid()
    )
  ));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_metadata_updated_at BEFORE UPDATE ON users_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sabs_claims_updated_at BEFORE UPDATE ON sabs_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lat_applications_updated_at BEFORE UPDATE ON lat_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ocf18_submissions_updated_at BEFORE UPDATE ON ocf18_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_reports_updated_at BEFORE UPDATE ON expert_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settlement_offers_updated_at BEFORE UPDATE ON settlement_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_providers_updated_at BEFORE UPDATE ON medical_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_undertakings_updated_at BEFORE UPDATE ON undertakings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disbursements_updated_at BEFORE UPDATE ON disbursements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SETUP COMPLETE
-- ============================================
SELECT 'Database setup complete!' as status;
