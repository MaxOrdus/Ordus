-- ============================================
-- FIX: Allow users to see other team members in their firm
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own metadata" ON users_metadata;

-- Create new policy: Users can view all members in their firm
CREATE POLICY "Users can view firm members"
  ON users_metadata FOR SELECT
  USING (
    firm_id = get_user_firm_id()
    OR id = auth.uid()  -- Always allow viewing own record
  );

-- Also need INSERT policy for admins to add new team members
DROP POLICY IF EXISTS "Admins can insert users" ON users_metadata;

CREATE POLICY "Admins can insert users in their firm"
  ON users_metadata FOR INSERT
  WITH CHECK (
    -- User creating must be an admin or it's their own record
    (
      EXISTS (
        SELECT 1 FROM users_metadata 
        WHERE id = auth.uid() 
        AND role = 'Admin'
      )
      AND firm_id = get_user_firm_id()
    )
    OR id = auth.uid()  -- Users can create their own record during signup
  );

-- Also allow admins to update other users in their firm
DROP POLICY IF EXISTS "Users can update own metadata" ON users_metadata;

CREATE POLICY "Users can update metadata"
  ON users_metadata FOR UPDATE
  USING (
    id = auth.uid()  -- Can update own record
    OR (
      -- Admins can update anyone in their firm
      EXISTS (
        SELECT 1 FROM users_metadata 
        WHERE id = auth.uid() 
        AND role = 'Admin'
      )
      AND firm_id = get_user_firm_id()
    )
  );

-- Verify the changes
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'users_metadata';

