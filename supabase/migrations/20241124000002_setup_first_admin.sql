-- ============================================
-- SETUP FIRST ADMIN USER
-- Run this after creating your first user in Supabase Auth Dashboard
-- ============================================

-- Step 1: Create the firm (if not already created)
-- Replace 'G. LALOSHI LEGAL' with your actual firm name
INSERT INTO firms (name)
VALUES ('G. LALOSHI LEGAL')
ON CONFLICT DO NOTHING
RETURNING id;

-- Step 2: Link your first user to the firm
-- IMPORTANT: Replace these values:
--   - 'your-email@example.com' with the email you used in Supabase Auth Dashboard
--   - 'Your Name' with your actual name
--   - 'Lawyer' can stay as 'Lawyer' (this is the Senior Lawyer/Admin role)

INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Your Name',  -- ⚠️ CHANGE THIS to your actual name
  'Lawyer',     -- This will be the Senior Lawyer/Admin
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL' LIMIT 1),
  true
FROM auth.users
WHERE auth.users.email = 'your-email@example.com'  -- ⚠️ CHANGE THIS to your actual email
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  firm_id = EXCLUDED.firm_id,
  is_active = true;

-- Step 3: Verify the setup
SELECT 
  um.id,
  um.name,
  um.role,
  um.firm_id,
  f.name as firm_name,
  au.email,
  um.is_active
FROM users_metadata um
JOIN firms f ON f.id = um.firm_id
JOIN auth.users au ON au.id = um.id
WHERE au.email = 'your-email@example.com';  -- ⚠️ CHANGE THIS to your actual email

-- If you see your user with firm_name = 'G. LALOSHI LEGAL', you're all set! ✅
