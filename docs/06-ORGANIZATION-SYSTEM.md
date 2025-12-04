# 🏢 Multi-Tenant Organization System

## How Organizations Work

### Concept: Multi-Tenancy

**Single Application, Multiple Organizations:**
```
Acadion Platform
├── MIT (Organization 1)
│   ├── Teachers
│   ├── Students
│   └── Classes
├── Harvard (Organization 2)
│   ├── Teachers
│   ├── Students
│   └── Classes
└── Stanford (Organization 3)
    └── ...
```

**Data Isolation:**
- MIT teachers can't see Harvard students
- Each organization's data is separate
- Achieved through `organization_id` in every table

### Organization Creation Flow

**File:** `frontend/src/pages/OrganizationOnboarding.tsx`

**Step-by-Step:**

1. **User visits onboarding page**
   - Not logged in yet
   - Fills form: Organization name, admin details

2. **Frontend validates input**
   - Checks name length (min 2 chars)
   - Validates email format
   - Checks if name is available

3. **Frontend calls API**
   ```typescript
   OrganizationService.createOrganizationWithAdmin({
     organizationName: "MIT",
     adminEmail: "admin@mit.edu"
   })
   ```

4. **Backend creates organization**
   - Inserts into `organizations` table
   - Returns organization_id

5. **User signs up**
   - Creates account
   - Links to organization_id

6. **User can now create classes**
   - All classes belong to their organization

### Organization Service

**File:** `frontend/src/services/organizationService.ts`

**Key Functions:**

1. **checkOrganizationNameAvailability()**
   - Checks if name is taken
   - Queries Supabase
   - Returns true/false

2. **createOrganizationWithAdmin()**
   - Creates new organization
   - Handles errors
   - Returns organization_id

3. **ensureUserProfile()**
   - After OAuth login
   - Creates user profile
   - Links to organization
