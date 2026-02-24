# EvoComp — Strategic Compensation Intelligence Platform

Phase 1 MVP: Replacing Excel for compensation planning.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Engines**: Supabase Edge Functions

## Getting Started

### Local Development

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables in `.env`:
   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

### Supabase Initialization

1. Ensure you have the Supabase CLI installed.
2. Link your project:
   ```bash
   supabase link --project-ref your_project_id
   ```
3. Apply migrations:
   ```bash
   supabase db push
   ```
4. Seed basic roles:
   ```bash
   psql -f supabase/seed.sql
   ```
5. Apply RLS policies (if not in migration):
   ```bash
   psql -f supabase/rls_policies.sql
   ```

## Multi-Tenant Security

- RLS is enforced on all tables.
- Use `get_current_tenant_id()` in SQL policies.
- Roles: `TENANT_ADMIN`, `COMP_ADMIN`, `ANALYST`, `EXECUTIVE`, `VIEWER`,
  `AUDITOR`.

## Core Engines

- **Import Engine**: `/supabase/functions/import-engine`
- **Scenario Engine**: `/supabase/functions/scenario-engine`
- **Reporting Engine**: `/supabase/functions/reporting-engine`
