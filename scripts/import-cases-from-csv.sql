-- ============================================
-- BULK IMPORT CASES FROM CSV
-- 
-- Instructions:
-- 1. Export your cases to CSV using the template format
-- 2. Copy your CSV data below (replace the example data)
-- 3. Run this SQL in Supabase SQL Editor
-- ============================================

-- Step 1: Create a temporary table for CSV data
CREATE TEMP TABLE temp_case_import (
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_dob DATE,
  case_title TEXT,
  date_of_loss DATE,
  date_opened DATE,
  estimated_value DECIMAL(12,2),
  status TEXT,
  stage TEXT,
  primary_lawyer_email TEXT,
  paralegal_email TEXT,
  mig_status TEXT,
  notes TEXT
);

-- Step 2: Insert your CSV data here (replace with your actual data)
-- Format: INSERT INTO temp_case_import VALUES (...), (...), ...;
INSERT INTO temp_case_import VALUES
  ('John Smith', 'john@example.com', '555-0100', '1980-01-15', 'Smith v. Insurance Co.', '2024-01-15', '2024-01-20', 50000, 'Active', 'Intake', 'glaloshilegal@gmail.com', NULL, 'MIG', 'Initial intake'),
  ('Jane Doe', 'jane@example.com', '555-0101', '1975-05-20', 'Doe v. City of Toronto', '2024-02-01', '2024-02-05', 75000, 'Active', 'Discovery', 'glaloshilegal@gmail.com', NULL, 'Non-MIG', 'Discovery phase');

-- Step 3: Get firm_id and create clients
INSERT INTO clients (firm_id, name, email, phone, date_of_birth)
SELECT DISTINCT
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL' LIMIT 1),
  client_name,
  NULLIF(client_email, ''),
  NULLIF(client_phone, ''),
  client_dob
FROM temp_case_import
ON CONFLICT DO NOTHING;

-- Step 4: Create cases
INSERT INTO cases (
  firm_id,
  client_id,
  title,
  date_of_loss,
  date_opened,
  status,
  stage,
  estimated_value,
  primary_lawyer_id,
  notes
)
SELECT 
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL' LIMIT 1),
  c.id,
  tci.case_title,
  tci.date_of_loss,
  tci.date_opened,
  COALESCE(tci.status, 'Active'),
  COALESCE(tci.stage, 'Intake'),
  COALESCE(tci.estimated_value, 0),
  um.id,
  ARRAY[tci.notes]
FROM temp_case_import tci
JOIN clients c ON c.name = tci.client_name
LEFT JOIN users_metadata um ON um.id = (
  SELECT id FROM auth.users WHERE email = tci.primary_lawyer_email LIMIT 1
)
RETURNING id;

-- Step 5: Create SABS claims for all cases
INSERT INTO sabs_claims (case_id, mig_status, cat_status)
SELECT 
  cases.id,
  COALESCE(tci.mig_status, 'MIG'),
  'Not Assessed'
FROM temp_case_import tci
JOIN clients c ON c.name = tci.client_name
JOIN cases ON cases.client_id = c.id AND cases.title = tci.case_title;

-- Step 6: Create Tort claims for all cases
INSERT INTO tort_claims (case_id, limitation_date, limitation_status)
SELECT 
  cases.id,
  tci.date_of_loss + INTERVAL '2 years',
  'Active'
FROM temp_case_import tci
JOIN clients c ON c.name = tci.client_name
JOIN cases ON cases.client_id = c.id AND cases.title = tci.case_title;

-- Step 7: Verify import
SELECT 
  'Import Summary' as summary,
  (SELECT COUNT(*) FROM clients WHERE firm_id = (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL')) as clients_imported,
  (SELECT COUNT(*) FROM cases WHERE firm_id = (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL')) as cases_imported,
  (SELECT COUNT(*) FROM sabs_claims) as sabs_claims_created,
  (SELECT COUNT(*) FROM tort_claims) as tort_claims_created;

-- Clean up temp table
DROP TABLE temp_case_import;

