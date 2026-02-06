# Running Supabase Migrations

Since Supabase CLI requires updating Command Line Tools, here's the **easiest way** to run your migrations:

## Option 1: Supabase Dashboard (Recommended - 2 minutes)

### Step 1: Add Case Assignment Fields

1. **Open SQL Editor**: https://supabase.com/dashboard/project/oddudqpfsnhpsfylyhvf/sql/new

2. **Copy this SQL** (from `supabase-add-case-assignment.sql`):

```sql
-- Add primary lawyer assignment
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS primary_lawyer_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL;

-- Add supporting team members (array of user IDs)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS assigned_team_members UUID[] DEFAULT ARRAY[]::UUID[];

-- Add paralegal assignment (for SABS work)
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS assigned_paralegal_id UUID REFERENCES users_metadata(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_cases_primary_lawyer ON cases(primary_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_paralegal ON cases(assigned_paralegal_id);
```

3. **Paste into SQL Editor** and click **"Run"**

4. **Verify**: You should see "Success. No rows returned"

### Step 2: Link Your Admin User

1. **Edit `setup-first-admin.sql` first**:
   - Replace `'your-email@example.com'` with your actual email
   - Replace `'Your Name'` with your actual name

2. **Copy the edited SQL** and paste into SQL Editor

3. **Click "Run"**

4. **Verify**: Run this query to check:

```sql
SELECT um.*, f.name as firm_name, au.email
FROM users_metadata um
JOIN firms f ON f.id = um.firm_id
JOIN auth.users au ON au.id = um.id
WHERE au.email = 'your-email@example.com';
```

You should see your user linked to the firm! ✅

## Option 2: Update Command Line Tools (For Future Use)

If you want to use Supabase CLI later:

```bash
# Update Command Line Tools
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install

# Then install Supabase CLI
brew install supabase/tap/supabase

# Login and link
supabase login
supabase link --project-ref oddudqpfsnhpsfylyhvf

# Run migrations
supabase db push
```

## Migration Files Ready

Your migration files are in:
- `supabase/migrations/20241124000001_add_case_assignment.sql`
- `supabase/migrations/20241124000002_setup_first_admin.sql`

These are ready for when you set up Supabase CLI, but **Option 1 (Dashboard) is faster for now**.

