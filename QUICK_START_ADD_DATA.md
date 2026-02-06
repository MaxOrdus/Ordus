# Quick Start: Adding Your First Cases

## Fastest Way: Use the App UI

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Login**: Go to http://localhost:3000/login
   - Email: `glaloshilegal@gmail.com`
   - Your password

3. **Add a Client**:
   - Click "Clients" in sidebar
   - Click "New Client" button
   - Fill in: Name, Email, Phone, Date of Birth
   - Save

4. **Add a Case**:
   - Click "Cases" in sidebar
   - Click "New Case" button
   - Fill in:
     - **Client**: Select from dropdown
     - **Date of Loss**: When the accident happened
     - **Client Birth Date**: (for limitation period calculation)
     - **Case Title**: e.g., "Smith v. Insurance Co."
   - Click "Create Case"
   
   ✅ **Done!** The system automatically:
   - Creates SABS and Tort claim records
   - Generates critical deadlines
   - Creates initial tasks
   - Calculates limitation periods

## Bulk Import: If You Have Many Cases

### Option A: CSV Import (Coming Soon)
- Export your cases to CSV
- Use the import tool (I'll build this)

### Option B: SQL Import (Now Available)
1. Open `scripts/import-cases-from-csv.sql`
2. Replace the example data with your cases
3. Run in Supabase SQL Editor

### Option C: Manual SQL (For Custom Data)
See `ADD_DATA_GUIDE.md` for SQL templates

## What Gets Created Automatically

When you create a case, the system automatically:

1. **Creates SABS Claim**:
   - MIG status (defaults to 'MIG')
   - Medical/rehab limit ($3,500 default)
   - CAT status ('Not Assessed')

2. **Creates Tort Claim**:
   - Limitation date (DOL + 2 years, adjusted for minors)
   - Limitation status ('Active')

3. **Generates Deadlines**:
   - SABS Notice (DOL + 7 days)
   - OCF-1 Deadline (DOL + 30 days)
   - Tort Notice (DOL + 120 days)
   - Limitation Period (DOL + 2 years)
   - Rule 48 Dismissal (5 years)

4. **Creates Initial Tasks**:
   - Send SABS Notice
   - Complete OCF-1
   - Request medical records
   - etc.

## Need Help?

- **Small number of cases** (< 10): Use the UI
- **Medium number** (10-50): Wait for CSV import tool, or use SQL
- **Large number** (50+): Use SQL bulk import

Let me know how many cases you have and I'll create the best import method for you!

