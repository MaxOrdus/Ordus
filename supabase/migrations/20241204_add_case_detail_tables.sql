-- Migration: Add/update tables for case detail features
-- Created: 2024-12-04
-- Description: Ensures all case detail tables exist with case_id for direct querying
--              Handles both fresh installs and upgrades from existing schema

-- ============================================
-- LAT Applications (License Appeal Tribunal)
-- ============================================
-- Check if table exists and add case_id if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lat_applications') THEN
        -- Table exists, check if it has case_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'lat_applications' AND column_name = 'case_id') THEN
            -- Add case_id column
            ALTER TABLE lat_applications ADD COLUMN case_id UUID REFERENCES cases(id) ON DELETE CASCADE;
            -- Populate from sabs_claims join
            UPDATE lat_applications la
            SET case_id = sc.case_id
            FROM sabs_claims sc
            WHERE la.sabs_claim_id = sc.id;
            -- Make it NOT NULL after populating
            ALTER TABLE lat_applications ALTER COLUMN case_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_lat_applications_case_id ON lat_applications(case_id);
        END IF;
    ELSE
        -- Create fresh table with case_id
        CREATE TABLE lat_applications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
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
        CREATE INDEX idx_lat_applications_case_id ON lat_applications(case_id);
    END IF;
END $$;

-- Enable RLS (safe to run multiple times)
ALTER TABLE lat_applications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to ensure correct version
DROP POLICY IF EXISTS "Users can access lat_applications for their firm's cases" ON lat_applications;
CREATE POLICY "Users can access lat_applications for their firm's cases"
ON lat_applications FOR ALL
USING (
    case_id IN (
        SELECT id FROM cases WHERE firm_id IN (
            SELECT firm_id FROM users_metadata WHERE id = auth.uid()
        )
    )
);

-- ============================================
-- OCF-18 Submissions (Treatment Plans)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ocf18_submissions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'ocf18_submissions' AND column_name = 'case_id') THEN
            ALTER TABLE ocf18_submissions ADD COLUMN case_id UUID REFERENCES cases(id) ON DELETE CASCADE;
            UPDATE ocf18_submissions o
            SET case_id = sc.case_id
            FROM sabs_claims sc
            WHERE o.sabs_claim_id = sc.id;
            ALTER TABLE ocf18_submissions ALTER COLUMN case_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_ocf18_submissions_case_id ON ocf18_submissions(case_id);
        END IF;
    ELSE
        CREATE TABLE ocf18_submissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
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
        CREATE INDEX idx_ocf18_submissions_case_id ON ocf18_submissions(case_id);
    END IF;
END $$;

ALTER TABLE ocf18_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access ocf18_submissions for their firm's cases" ON ocf18_submissions;
CREATE POLICY "Users can access ocf18_submissions for their firm's cases"
ON ocf18_submissions FOR ALL
USING (
    case_id IN (
        SELECT id FROM cases WHERE firm_id IN (
            SELECT firm_id FROM users_metadata WHERE id = auth.uid()
        )
    )
);

-- ============================================
-- Communications (Client Communication Log)
-- ============================================
CREATE TABLE IF NOT EXISTS communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Phone', 'Email', 'Meeting', 'Letter')),
    date DATE NOT NULL,
    subject TEXT NOT NULL,
    notes TEXT,
    initiated_by TEXT NOT NULL CHECK (initiated_by IN ('Client', 'Firm')),
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access communications for their firm's cases" ON communications;
CREATE POLICY "Users can access communications for their firm's cases"
ON communications FOR ALL
USING (
    case_id IN (
        SELECT id FROM cases WHERE firm_id IN (
            SELECT firm_id FROM users_metadata WHERE id = auth.uid()
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_communications_case_id ON communications(case_id);
CREATE INDEX IF NOT EXISTS idx_communications_follow_up ON communications(follow_up_required, follow_up_date) WHERE follow_up_required = TRUE;

-- ============================================
-- Disbursements
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disbursements') THEN
        CREATE TABLE disbursements (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            description TEXT NOT NULL,
            amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            category TEXT NOT NULL CHECK (category IN ('Expert', 'Court Fees', 'Transcripts', 'Medical Records', 'Process Serving', 'Other')),
            assessable BOOLEAN DEFAULT FALSE,
            paid BOOLEAN DEFAULT FALSE,
            invoice_number TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_disbursements_case_id ON disbursements(case_id);
    END IF;
END $$;

ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access disbursements for their firm's cases" ON disbursements;
CREATE POLICY "Users can access disbursements for their firm's cases"
ON disbursements FOR ALL
USING (
    case_id IN (
        SELECT id FROM cases WHERE firm_id IN (
            SELECT firm_id FROM users_metadata WHERE id = auth.uid()
        )
    )
);

-- ============================================
-- Expert Reports
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expert_reports') THEN
        CREATE TABLE expert_reports (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
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
        CREATE INDEX idx_expert_reports_case_id ON expert_reports(case_id);
    END IF;
END $$;

ALTER TABLE expert_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access expert_reports for their firm's cases" ON expert_reports;
CREATE POLICY "Users can access expert_reports for their firm's cases"
ON expert_reports FOR ALL
USING (
    case_id IN (
        SELECT id FROM cases WHERE firm_id IN (
            SELECT firm_id FROM users_metadata WHERE id = auth.uid()
        )
    )
);

-- ============================================
-- Settlement Offers
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settlement_offers') THEN
        CREATE TABLE settlement_offers (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            type TEXT NOT NULL CHECK (type IN ('Plaintiff', 'Defendant')),
            gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            net_amount DECIMAL(12,2),
            status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Accepted', 'Rejected', 'Countered')),
            expires_date DATE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_settlement_offers_case_id ON settlement_offers(case_id);
    END IF;
END $$;

ALTER TABLE settlement_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access settlement_offers for their firm's cases" ON settlement_offers;
CREATE POLICY "Users can access settlement_offers for their firm's cases"
ON settlement_offers FOR ALL
USING (
    case_id IN (
        SELECT id FROM cases WHERE firm_id IN (
            SELECT firm_id FROM users_metadata WHERE id = auth.uid()
        )
    )
);

-- ============================================
-- Medical Providers
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_providers') THEN
        CREATE TABLE medical_providers (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
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
        CREATE INDEX idx_medical_providers_case_id ON medical_providers(case_id);
    END IF;
END $$;

ALTER TABLE medical_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access medical_providers for their firm's cases" ON medical_providers;
CREATE POLICY "Users can access medical_providers for their firm's cases"
ON medical_providers FOR ALL
USING (
    case_id IN (
        SELECT id FROM cases WHERE firm_id IN (
            SELECT firm_id FROM users_metadata WHERE id = auth.uid()
        )
    )
);

-- ============================================
-- Defendants (for tort claims)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'defendants') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'defendants' AND column_name = 'case_id') THEN
            ALTER TABLE defendants ADD COLUMN case_id UUID REFERENCES cases(id) ON DELETE CASCADE;
            UPDATE defendants d
            SET case_id = tc.case_id
            FROM tort_claims tc
            WHERE d.tort_claim_id = tc.id;
            ALTER TABLE defendants ALTER COLUMN case_id SET NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_defendants_case_id ON defendants(case_id);
        END IF;
    ELSE
        CREATE TABLE defendants (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('Driver', 'Owner', 'Lessee')),
            insurance_company TEXT,
            policy_number TEXT,
            served BOOLEAN DEFAULT FALSE,
            served_date DATE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_defendants_case_id ON defendants(case_id);
    END IF;
END $$;

ALTER TABLE defendants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access defendants for their firm's cases" ON defendants;
CREATE POLICY "Users can access defendants for their firm's cases"
ON defendants FOR ALL
USING (
    case_id IN (
        SELECT id FROM cases WHERE firm_id IN (
            SELECT firm_id FROM users_metadata WHERE id = auth.uid()
        )
    )
);

-- ============================================
-- Grant permissions to authenticated users
-- ============================================
GRANT ALL ON lat_applications TO authenticated;
GRANT ALL ON ocf18_submissions TO authenticated;
GRANT ALL ON communications TO authenticated;
GRANT ALL ON disbursements TO authenticated;
GRANT ALL ON expert_reports TO authenticated;
GRANT ALL ON settlement_offers TO authenticated;
GRANT ALL ON medical_providers TO authenticated;
GRANT ALL ON defendants TO authenticated;

-- ============================================
-- Add updated_at triggers
-- ============================================
DO $$
BEGIN
    -- Create trigger function if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Create triggers for new tables
DROP TRIGGER IF EXISTS update_communications_updated_at ON communications;
CREATE TRIGGER update_communications_updated_at
    BEFORE UPDATE ON communications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Only create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lat_applications_updated_at') THEN
        CREATE TRIGGER update_lat_applications_updated_at
            BEFORE UPDATE ON lat_applications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ocf18_submissions_updated_at') THEN
        CREATE TRIGGER update_ocf18_submissions_updated_at
            BEFORE UPDATE ON ocf18_submissions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_disbursements_updated_at') THEN
        CREATE TRIGGER update_disbursements_updated_at
            BEFORE UPDATE ON disbursements
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expert_reports_updated_at') THEN
        CREATE TRIGGER update_expert_reports_updated_at
            BEFORE UPDATE ON expert_reports
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_settlement_offers_updated_at') THEN
        CREATE TRIGGER update_settlement_offers_updated_at
            BEFORE UPDATE ON settlement_offers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_medical_providers_updated_at') THEN
        CREATE TRIGGER update_medical_providers_updated_at
            BEFORE UPDATE ON medical_providers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_defendants_updated_at') THEN
        CREATE TRIGGER update_defendants_updated_at
            BEFORE UPDATE ON defendants
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
