# Password Reset Scripts

## Quick Reset (One Command)

**You need your Supabase Service Role Key:**

1. Get it from: https://supabase.com/dashboard → Your Project → Settings → API → `service_role` secret

2. Run this command in terminal:

```bash
cd /Users/eureka/.openclaw/workspace/Ordus
node scripts/reset-passwords.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with your actual service role key.

---

## Alternative: Environment Variable

```bash
export SUPABASE_SERVICE_ROLE_KEY=your-key-here
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
node scripts/reset-passwords.js
```

---

## What This Does

Resets passwords for 3 users to `Laerti2000`:
- gjergjilaloshi@yahoo.com
- george@diamondlaw.ca  
- glaloshilegal@gmail.com

If users don't exist, it creates them with Admin role.

---

## Security Note

The service role key is powerful - it bypasses all RLS policies. Only use it for admin operations like this.