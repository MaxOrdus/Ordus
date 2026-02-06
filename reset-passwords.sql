-- ============================================
-- RESET PASSWORDS FOR USERS
-- Run this in Supabase SQL Editor
-- ============================================

-- First, let's see the current users
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
WHERE email IN (
  'gjergjilaloshi@yahoo.com',
  'george@diamondlaw.ca', 
  'glaloshilegal@gmail.com'
);

-- ============================================
-- METHOD 1: Send Password Reset Email (Recommended)
-- Users will get an email to set their own password
-- ============================================

-- Note: Supabase doesn't have a direct SQL function for this.
-- Use the Supabase Dashboard instead:
-- Authentication → Users → Click "⋯" next to user → "Send password recovery"

-- ============================================
-- METHOD 2: Direct Password Update (Admin only)
-- This requires the auth.admin() function or Supabase CLI
-- ============================================

-- Option A: Using Supabase CLI (run in terminal)
-- supabase auth admin updateuser --email gjergjilaloshi@yahoo.com --password "Laerti2000"
-- supabase auth admin updateuser --email george@diamondlaw.ca --password "Laerti2000"
-- supabase auth admin updateuser --email glaloshilegal@gmail.com --password "Laerti2000"

-- Option B: Using pg_auth (if available)
-- Note: This requires appropriate privileges

-- ============================================
-- METHOD 3: Delete and Recreate Users (Nuclear option)
-- Only if Method 1 doesn't work
-- ============================================

-- WARNING: This deletes the user and all their data!
-- Uncomment only if you know what you're doing:

-- DELETE FROM auth.users WHERE email = 'gjergjilaloshi@yahoo.com';
-- DELETE FROM auth.users WHERE email = 'george@diamondlaw.ca';
-- DELETE FROM auth.users WHERE email = 'glaloshilegal@gmail.com';

-- Then recreate via Supabase Auth API or dashboard

-- ============================================
-- METHOD 4: Create a Password Reset Function
-- ============================================

-- Create a function to reset password by email (admin use only)
CREATE OR REPLACE FUNCTION admin_reset_password(user_email TEXT, new_password TEXT)
RETURNS VOID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Note: In Supabase, you cannot directly update encrypted_password via SQL
  -- for security reasons. Use the Admin API or CLI instead.
  
  RAISE NOTICE 'User % found. Use Supabase CLI or Dashboard to reset password.', user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Call the function (this will just verify users exist)
-- SELECT admin_reset_password('gjergjilaloshi@yahoo.com', 'Laerti2000');

-- ============================================
-- RECOMMENDED: Use Supabase Dashboard
-- ============================================

/*
Step-by-step:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "Authentication" (left sidebar)
4. Click "Users"
5. Search for each email:
   - gjergjilaloshi@yahoo.com
   - george@diamondlaw.ca
   - glaloshilegal@gmail.com
6. For each user:
   - Click the three dots (⋯) on the right
   - Select "Send password recovery"
   - Or "Delete user" if you want to recreate them

The users will receive an email with a link to set their password to "Laerti2000"
*/

-- ============================================
-- ALTERNATIVE: Node.js Script (if you have API access)
-- ============================================

/*
If you have the SUPABASE_SERVICE_ROLE_KEY, you can use this Node.js script:

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-service-role-key'
);

const emails = [
  'gjergjilaloshi@yahoo.com',
  'george@diamondlaw.ca',
  'glaloshilegal@gmail.com'
];

async function resetPasswords() {
  for (const email of emails) {
    // Send password reset email
    const { error } = await supabase.auth.admin.send_email({
      type: 'recovery',
      email: email
    });
    
    if (error) {
      console.error(`Failed for ${email}:`, error.message);
    } else {
      console.log(`Password reset email sent to ${email}`);
    }
  }
}

resetPasswords();
*/

-- ============================================
-- VERIFY USERS EXIST
-- ============================================
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users 
WHERE email IN (
  'gjergjilaloshi@yahoo.com',
  'george@diamondlaw.ca', 
  'glaloshilegal@gmail.com'
);
