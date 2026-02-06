# Supabase Setup Guide

Follow these steps to set up your Supabase backend for Ordus.

## ✅ Step 1: Install Packages (Already Done)
- ✅ Installed `@supabase/supabase-js` and `@supabase/ssr`
- ✅ Created Supabase client files (`lib/supabase/client.ts` and `server.ts`)
- ✅ Created `.env.local` with your credentials

## 📋 Step 2: Set Up Database Schema

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/oddudqpfsnhpsfylyhvf

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query** button (top right)

3. **Copy and Paste the Schema**
   - Open the file `supabase-schema.sql` in your project
   - Copy **ALL** the contents (Cmd+A, Cmd+C)
   - Paste into the SQL Editor (Cmd+V)

4. **Run the Query**
   - Click **Run** button (or press Cmd+Enter)
   - Wait for it to complete (should see "Success. No rows returned")

5. **Verify Tables Were Created**
   - Go to **Table Editor** in the left sidebar
   - You should see all the tables listed (firms, users_metadata, cases, clients, tasks, etc.)

## 🔒 Step 3: Configure Row Level Security (RLS) Policies

1. **Go back to SQL Editor**
   - Click **SQL Editor** → **New Query**

2. **Copy and Paste RLS Policies**
   - Open the file `supabase-rls-policies.sql`
   - Copy **ALL** the contents
   - Paste into the SQL Editor

3. **Run the Query**
   - Click **Run** button
   - Wait for completion

4. **Verify RLS is Enabled**
   - Go to **Table Editor**
   - Click on any table (e.g., `cases`)
   - You should see "RLS enabled" badge at the top

## 📦 Step 4: Set Up Storage Bucket

1. **Create the Bucket**
   - Click **Storage** in the left sidebar
   - Click **New bucket** button
   - Name: `documents`
   - **Important:** Make sure **Public bucket** is **UNCHECKED** (should be Private)
   - Click **Create bucket**

2. **Set Up Storage Policies**
   - Go to **SQL Editor** → **New Query**
   - Open the file `supabase-storage-policies.sql`
   - Copy **ALL** the contents
   - Paste into the SQL Editor
   - Click **Run**

3. **Verify Bucket Created**
   - Go back to **Storage**
   - You should see the `documents` bucket listed

## ✅ Step 5: Verify Everything Works

1. **Check Tables**
   - Go to **Table Editor**
   - Verify you can see all tables

2. **Check RLS**
   - Click on any table
   - Look for "RLS enabled" badge

3. **Check Storage**
   - Go to **Storage**
   - Verify `documents` bucket exists and is Private

## 🎉 You're Done!

Your Supabase backend is now set up with:
- ✅ All database tables created
- ✅ Row Level Security enabled
- ✅ Storage bucket configured
- ✅ Proper indexes for performance
- ✅ Automatic `updated_at` triggers

## 📝 Next Steps

After setup, you'll need to:
1. Create your first firm (via SQL or through the app)
2. Create your first user account (via Supabase Auth)
3. Link the user to the firm in `users_metadata` table
4. Start connecting your frontend to Supabase!

## 🆘 Troubleshooting

**Error: "relation already exists"**
- Some tables might already exist. You can either:
  - Drop existing tables first (be careful!)
  - Or skip creating tables that already exist

**Error: "function already exists"**
- The helper functions might already exist. This is okay, just continue.

**Can't see tables after running schema**
- Refresh the Table Editor page
- Check the SQL Editor for any error messages

**RLS policies not working**
- Make sure you ran the RLS policies SQL AFTER the schema
- Check that RLS is enabled on each table (should see badge in Table Editor)

