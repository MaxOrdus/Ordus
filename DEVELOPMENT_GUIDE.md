# Ordus Development & Testing Guide

## 🚀 Running the App Locally

### Step 1: Start the Dev Server
```bash
cd /Users/eureka/.openclaw/workspace/Ordus
npm install
npm run dev
```
App will be at: **http://localhost:3000**

---

## 🧪 Testing Different Features

### 1. Authentication Testing
**Test these scenarios:**
- Sign up with new email
- Login with existing user
- Logout and session persistence
- Password reset flow

**Where to look:**
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `components/auth/AuthProvider.tsx`

**Debug auth issues:**
Check browser DevTools → Console for:
- `[Auth] Login attempt` messages
- `[Auth] Metadata query error` (if any)
- Supabase connection errors

---

### 2. Case Management Testing
**Test these flows:**

**Create a Case:**
1. Dashboard → "New Case" button
2. Fill client info, date of loss, limitation date
3. Save and verify it appears in case list

**Test Case Detail Page:**
- Navigate to `/cases/[id]`
- Check Medical Evidence Matrix displays
- Add a settlement offer
- Track expert reports

**Test Role-Based Views:**
- Login as Lawyer → Should see TeamLead or CaseWorker dashboard
- Login as Law Clerk → Should see TaskOnly dashboard
- Login as Admin → Should see Firm dashboard

---

### 3. SABS Workflow Testing
**Test OCF-18 Tracking:**
1. Open a case
2. Go to SABS tab
3. Add OCF-18 submission
4. Check deadline calculations
5. Test status changes (Pending → Approved)

**Test LAT Applications:**
1. Add LAT application with denial date
2. Verify limitation date auto-calculates (2 years from denial)
3. Check case conference/hearing date tracking

---

### 4. Settlement Calculator Testing
**Test scenarios:**
1. Add settlement offer ($100,000)
2. Set disbursements ($15,000)
3. Verify net-to-client calculation
4. Test hydraulic calculation for SABS/Tort

**Check calculations in:**
- `lib/settlement-calculator.ts`
- `components/cases/SettlementCalculator.tsx`

---

### 5. Document Management (Future Feature)
Currently placeholders. Test:
- Document upload form (will show alert for now)
- Document list view
- Court Mode mobile view

---

## 🔧 Making Improvements

### Pattern: Edit → Test → Commit

**1. Make Your Change**
```bash
# Edit files in VSCode or terminal
# Common files to modify:
# - components/cases/*.tsx  (case features)
# - components/dashboard/*.tsx  (dashboard widgets)
# - lib/*.ts  (utilities, calculations)
# - app/api/**/*.ts  (API routes)
```

**2. Hot Reload Testing**
Next.js auto-reloads on save. Just:
- Save file
- Check browser immediately
- Errors appear in terminal and browser console

**3. Check for Errors**
```bash
# In another terminal tab:
npm run lint

# Fix any issues shown
```

**4. Commit Your Changes**
```bash
git add .
git commit -m "Fix: [description of change]"
git push
```

---

## 🐛 Common Debugging

### Issue: "Cannot connect to Supabase"
**Fix:**
1. Check `.env.local` has correct URL and keys
2. Verify Supabase project is running (dashboard shows active)
3. Check browser console for CORS errors

### Issue: "User metadata not found"
**Fix:**
1. User signed up but metadata wasn't created
2. Run in Supabase SQL Editor:
```sql
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
VALUES ('user-id-here', 'Your Name', 'Admin', 'firm-id', true);
```

### Issue: "Cases not loading"
**Fix:**
1. Check user has `firm_id` set in `users_metadata`
2. Verify RLS policies are enabled
3. Check case has matching `firm_id`

### Issue: Component not rendering
**Fix:**
1. Check browser DevTools → Console for React errors
2. Verify data is being passed correctly (console.log)
3. Check for null/undefined values

---

## 📊 Testing Checklist

### Core Features
- [ ] Sign up new user
- [ ] Login/logout
- [ ] Create new case
- [ ] View case list
- [ ] Edit case details
- [ ] Add client
- [ ] Create tasks

### SABS Features
- [ ] OCF-18 submission tracking
- [ ] LAT application workflow
- [ ] Medical provider tracking
- [ ] Treatment gap detection

### Tort Features
- [ ] Expert report tracking (Rule 53.03)
- [ ] Undertakings management
- [ ] Settlement offers
- [ ] Pre-trial checklist

### Dashboard
- [ ] Role-based view (Lawyer vs Clerk vs Admin)
- [ ] Case velocity graph
- [ ] Red zone alerts
- [ ] Billable streak

---

## 🎯 Quick Development Tips

### Add a Console Log for Debugging
```typescript
// In any component
console.log('[ComponentName] Data:', data)
console.log('[ComponentName] User:', user)
```

### Test API Route
```bash
# Test your API
curl http://localhost:3000/api/cases
```

### Reset Local Database
```bash
# Delete dev.db and restart
rm dev.db
npm run dev
```

### Check Type Errors
```bash
npx tsc --noEmit
```

---

## 🚀 Production Build Test

Before deploying, test production build locally:
```bash
npm run build
npm start
```
This catches issues that don't appear in dev mode.

---

**Need help? Check the files:**
- `TODO.md` - Known issues and roadmap
- `SETUP_GUIDE.md` - Setup instructions
- `README.md` - Architecture overview
