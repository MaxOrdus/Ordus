-- ============================================
-- ADD ADMIN ROLE TO USERS_METADATA
-- Run this to allow 'ADMIN' as a valid role
-- ============================================

-- Drop the existing check constraint
ALTER TABLE users_metadata
DROP CONSTRAINT IF EXISTS users_metadata_role_check;

-- Add new constraint that includes ADMIN
ALTER TABLE users_metadata
ADD CONSTRAINT users_metadata_role_check 
CHECK (role IN ('Admin', 'Lawyer', 'LawClerk', 'LegalAssistant', 'AccidentBenefitsCoordinator'));

-- Update existing user to ADMIN role (if needed)
-- Uncomment and run separately if you want to update your user:
-- UPDATE users_metadata 
-- SET role = 'Admin' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'glaloshilegal@gmail.com');

