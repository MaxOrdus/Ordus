# Admin API Setup Guide

The Super Admin dashboard now uses server-side API routes to manage firms and users. This allows you to create users directly from your admin dashboard without needing to go to Supabase.

## Required: Add Service Role Key

You need to add the **Service Role Key** to your environment variables for the admin APIs to work.

### Step 1: Get Your Service Role Key

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)

⚠️ **IMPORTANT**: The service role key bypasses Row Level Security. Keep it secret and never expose it to the client.

### Step 2: Add to .env.local

Open your `.env.local` file and add:

```env
# Your existing keys:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Add this NEW key:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 3: Restart the Dev Server

After adding the key, restart your Next.js dev server:

```bash
# Stop the current server (Ctrl+C)
# Then run:
npm run dev
```

## What This Enables

With the service role key configured, you can now:

1. **Create Firms** - Add new law firms directly from the dashboard
2. **Create Users** - Add users with any role to any firm
3. **Activate/Deactivate Users** - Toggle user access
4. **Delete Firms** - Remove firms (only if they have no users)

All of this works from your Super Admin dashboard at `/super-admin` - no need to touch Supabase!

## Security Notes

- The service role key is only used in server-side API routes
- It's never exposed to the browser
- All admin operations go through `/api/admin/*` routes
- The client-side code uses the regular anon key


