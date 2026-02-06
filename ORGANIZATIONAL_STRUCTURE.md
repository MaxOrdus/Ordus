# Organizational Structure Guide

## Current Firm Structure

Based on your description, here's the organizational hierarchy:

```
G. LALOSHI LEGAL (Firm)
│
├── Senior Lawyer (Admin/Owner) - YOU
│   ├── Junior Lawyer 1
│   │   ├── Clerk 1
│   │   └── Clerk 2
│   ├── Junior Lawyer 2
│   │   ├── Clerk 1
│   │   └── Clerk 2
│   ├── Junior Lawyer 3
│   │   └── Clerk 1
│   └── Junior Lawyer 4
│       └── Clerk 1
│   └── Shared Clerks (3-4) - Work for Senior Lawyer directly
│
└── Paralegal Team (Separate)
    ├── Paralegal 1 (works with different lawyers on different files)
    ├── Paralegal 2 (works with different lawyers on different files)
    └── Paralegal Clerks (5-6) - Shared among paralegals
```

## Key Characteristics

1. **Multi-Team Structure**: 
   - Litigation Team (Senior + Junior Lawyers + Clerks)
   - SABS Team (Paralegals + Clerks)

2. **Cross-Team Collaboration**:
   - Paralegals work on files with different lawyers
   - Cases can have multiple team members assigned

3. **Hierarchical Assignment**:
   - Cases assigned to Senior Lawyer or Junior Lawyer
   - Tasks delegated to Clerks
   - SABS work assigned to Paralegals

## Current Database Schema Support

### ✅ What We Have:

1. **Firm-Level Isolation**: All users belong to one firm (`firm_id`)
2. **Role-Based Access**: Users have roles (Lawyer, LawClerk, LegalAssistant, AccidentBenefitsCoordinator)
3. **Case Assignment**: Cases can be assigned to clients, but not directly to lawyers
4. **Task Assignment**: Tasks can be assigned to specific users or roles

### ⚠️ What We Might Need to Add:

1. **Team/Group Structure**: 
   - Track which lawyers report to which senior lawyer
   - Track which clerks belong to which lawyer
   - Track paralegal teams

2. **Case Ownership**:
   - Assign cases to specific lawyers (not just clients)
   - Track primary lawyer vs. supporting team members

3. **Hierarchical Permissions**:
   - Senior lawyers can see all their team's cases
   - Junior lawyers see their own cases + assigned cases
   - Clerks see cases they're assigned to

## Recommended Approach

### Option 1: Use Existing Schema (Simpler)
- Assign cases to lawyers via a `primary_lawyer_id` field
- Use task assignment to delegate work
- Use tags/notes to track team relationships

### Option 2: Add Team Structure (More Complex)
- Create `teams` table
- Create `team_members` table
- Add `team_id` to cases
- Add hierarchical queries

## Immediate Next Steps

1. **Set up your first admin user** (run `setup-first-admin.sql`)
2. **Create additional users** as needed:
   - Junior Lawyers
   - Clerks
   - Paralegals
   - Paralegal Clerks

3. **Assign cases to lawyers** - We can add a `primary_lawyer_id` field to cases table

4. **Use task assignment** for delegation within teams

## User Creation Template

When creating new users, use this structure:

```sql
-- Create Junior Lawyer
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Junior Lawyer Name',
  'Lawyer',
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL'),
  true
FROM auth.users
WHERE auth.users.email = 'junior-lawyer@example.com';

-- Create Clerk
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Clerk Name',
  'LawClerk',
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL'),
  true
FROM auth.users
WHERE auth.users.email = 'clerk@example.com';

-- Create Paralegal
INSERT INTO users_metadata (id, name, role, firm_id, is_active)
SELECT 
  auth.users.id,
  'Paralegal Name',
  'AccidentBenefitsCoordinator',
  (SELECT id FROM firms WHERE name = 'G. LALOSHI LEGAL'),
  true
FROM auth.users
WHERE auth.users.email = 'paralegal@example.com';
```

## Questions to Consider

1. **Case Assignment**: Should cases be assigned to:
   - Primary lawyer only?
   - Primary lawyer + supporting team?
   - Multiple lawyers (co-counsel)?

2. **Visibility**: Who should see what?
   - Senior Lawyer: All firm cases?
   - Junior Lawyer: Only assigned cases?
   - Clerks: Only cases they have tasks on?

3. **SABS Workflow**: 
   - Are paralegals assigned to specific cases?
   - Or do they work on all SABS-related tasks?

Let me know your preferences and I can:
- Add `primary_lawyer_id` to cases table
- Create team structure tables
- Update RLS policies for hierarchical access
- Create views/dashboards for team management

