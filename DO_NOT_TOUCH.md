# DO NOT TOUCH

The following files and directories are CRITICAL to the core architecture and
security of EvoComp. Any modifications must be proposed in `docs/CHANGELOG.md`
and approved by the Lead Architect.

- `docs/ARCHITECTURE.md`: Core system design principles.
- `docs/DB_SCHEMA.md`: Canonical database model.
- `docs/SECURITY.md`: RLS and RBAC enforcement logic.
- `docs/MVP_SCOPE.md`: Phase 1 boundary definitions.
- `supabase/migrations/`: Database evolution history.
- `supabase/rls_policies.sql`: Security foundation.

## Rules for AI Agents

1. DO NOT overwrite existing documentation in `docs/` without explicit
   permission.
2. ALWAYS output full file contents for new or modified files.
3. RLS must be enabled and verified for every new table.
