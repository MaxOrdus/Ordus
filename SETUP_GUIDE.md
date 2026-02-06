# Ordus Setup Guide

## Quick Start (5 minutes)

### 1. Create Supabase Project
1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Name it "ordus" (or your firm name)
4. Choose a region close to you (us-east-1 for Toronto)
5. Wait 2-3 minutes for provisioning

### 2. Get Your Credentials
In your Supabase dashboard:
1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Update Environment Variables
Edit `.env.local` in your Ordus folder:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Database Setup
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase/complete-setup.sql`
4. Paste and click **Run**
5. Wait for "Database setup complete!" message

### 5. Start the App
```bash
cd Ordus
npm install
npm run dev
```

Open http://localhost:3000 and sign up with your email!

---

## First Time Setup

### Create Your Firm
After signing up, you need to create your firm in the database:

1. Go to Supabase → SQL Editor
2. Run:
```sql
INSERT INTO firms (name) VALUES ('Your Firm Name') RETURNING id;
```

3. Copy the returned `id`

4. Update your user to link to the firm:
```sql
UPDATE users_metadata 
SET firm_id = 'your-firm-id-here', 
    role = 'Admin'
WHERE id = 'your-user-id-here';
```

### Create First Client
Use the app UI or SQL:
```sql
INSERT INTO clients (firm_id, name, email, phone, date_of_birth)
VALUES ('your-firm-id', 'Test Client', 'client@example.com', '416-555-1234', '1980-01-01');
```

### Create First Case
```sql
INSERT INTO cases (firm_id, client_id, title, date_of_loss, date_opened, status, stage)
VALUES (
  'your-firm-id', 
  'your-client-id',
  'MVA 2024 - Test Client',
  '2024-01-15',
  CURRENT_DATE,
  'Active',
  'Intake'
);
```

---

## Common Issues

### "No metadata found for user"
- This is normal on first signup
- The app creates metadata automatically
- If it fails, manually create:
```sql
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
VALUES ('user-id-from-auth', 'Your Name', 'Admin', 'firm-id', true);
```

### "Cannot access cases"
- Make sure your user has a `firm_id` set
- Check RLS policies are enabled

### Authentication not working
- Verify `.env.local` has correct Supabase URL and keys
- Ensure keys are not expired (Supabase rotates them occasionally)

---

## Next Steps After Setup

1. **Import your existing cases** - Use the CSV import feature
2. **Set up team members** - Add lawyers, clerks, assistants
3. **Configure email notifications** - Add SendGrid/AWS SES keys
4. **Enable document storage** - Set up Supabase Storage

## Production Deployment

When ready for production:
1. Update `.env.local` with production Supabase project
2. Set up custom domain in Supabase
3. Enable email verification in Supabase Auth settings
4. Configure SMTP for transactional emails
5. Set up automated backups

---

**Need Help?**
Check the TODO.md for feature roadmap and known issues.
