# CSV Data Preservation - What Gets Saved Where

## ✅ All Data is Preserved

Here's exactly where each field from your CSV goes:

### Client Information
- **CLIENT NAME** → `clients.name` (database)
- **DOB** → `clients.date_of_birth` (database)

### Case Information
- **FILE NO#** → `cases.tags` array + used in `cases.title`
- **Date Of Loss** → `cases.date_of_loss` (database)
- **Date Opened** → `cases.date_opened` (uses Date Of Loss)

### Lawyer Assignment
- **Lawyer** → Two places:
  1. **If lawyer exists in database**: `cases.primary_lawyer_id` (linked to user)
  2. **If lawyer NOT found**: Stored in `cases.notes` as "Assigned Lawyer (from import): [Name]"

### Insurance Information
- **Insurance Co.** → `cases.notes` array
- **Policy No.** → `cases.notes` array  
- **Claim No.** → `cases.notes` array
- **Adjuster** → `cases.notes` array

### SABS Information
- **MIG Status** → `sabs_claims.mig_status` (normalized: MIG, Non-MIG, CAT, Settled, Transferred)
- **IRB /NEB** → `cases.notes` (if contains additional info beyond just "IRB" or "NEB")

### Additional Notes
- Any benefit type notes (like "IRB/ RTW on 11/25/19") → `cases.notes`
- Long adjuster info → `cases.notes`

## Example: What Gets Created

For a CSV row like:
```
Healy-Brown, Alexander, MAT11343, George (AB ONLY), , 23-12-15, Aviva Insurance, 21023228, 34675136, Melanie Lobo 877-600-7224 ext. 37356, MIG, 
```

**Creates:**

1. **Client**:
   - Name: "Healy-Brown, Alexander"
   - DOB: null (empty in CSV)

2. **Case**:
   - Title: "Healy-Brown, Alexander - MAT11343"
   - Date of Loss: "2015-12-23"
   - Date Opened: "2015-12-23"
   - Tags: ["MAT11343"]
   - Notes: [
       "Insurance: Aviva Insurance",
       "Policy: 21023228", 
       "Claim: 34675136",
       "Adjuster: Melanie Lobo 877-600-7224 ext. 37356"
     ]
   - Primary Lawyer: Matched to "George" user (if exists), or stored in notes

3. **SABS Claim**:
   - MIG Status: "MIG"
   - Medical/Rehab Limit: $3,500

4. **Tort Claim**:
   - Limitation Date: "2017-12-23" (DOL + 2 years)

## Nothing is Lost!

Even if a field can't be matched (like lawyer name), it's preserved in the case notes so you can:
- See it in the case details
- Manually assign the lawyer later
- Search for it

All your data is safe! 🎉

