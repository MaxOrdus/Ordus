-- Add Paralegal role to the database
-- Run this in Supabase SQL Editor

-- 1. Drop the existing constraint
ALTER TABLE users_metadata DROP CONSTRAINT IF EXISTS users_metadata_role_check;

-- 2. Add new constraint with Paralegal included
ALTER TABLE users_metadata ADD CONSTRAINT users_metadata_role_check 
  CHECK (role IN ('SuperAdmin', 'Admin', 'Lawyer', 'LawClerk', 'LegalAssistant', 'Paralegal', 'AccidentBenefitsCoordinator'));

-- 3. Update all LegalAssistant to Paralegal
UPDATE users_metadata SET role = 'Paralegal' WHERE role = 'LegalAssistant';

-- 4. Verify the update
SELECT role, COUNT(*) as count FROM users_metadata GROUP BY role ORDER BY count DESC;

