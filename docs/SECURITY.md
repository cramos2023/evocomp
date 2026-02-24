# EvoComp — Security Model (Source of Truth)

## Principles
- Defense in depth:
  - RLS in database as primary enforcement
  - API checks as secondary enforcement
- Least privilege:
  - Access is granted only to necessary data by role and scope
- Auditability:
  - Every critical mutation and approval action is logged

## Multi-Tenancy
- Every table includes tenant_id
- RLS policy: users can only access rows where tenant_id = auth.tenant_id()

## Roles (RBAC)
- TENANT_ADMIN: user/role/scope management, full tenant config
- COMP_ADMIN: cycles/scenarios/bands/imports, can lock/export
- ANALYST: run scenarios, view results, limited config
- EXECUTIVE: read-only dashboards and reports
- VIEWER: limited read-only
- AUDITOR: read-only + audit logs

## Scopes (ABAC)
- org_units hierarchical: REGION > COUNTRY > BU > COST_CENTER
- user_scopes:
  - scope_level: VIEW / EDIT / APPROVE
  - data_access: SALARY_FULL / SALARY_MASKED / AGGREGATED_ONLY

Phase 1: HR-led usage implies most users are COMP_ADMIN/ANALYST with SALARY_FULL,
but the model must be built to support manager masking in Phase 2.

## Sensitive data handling
- Salary fields are sensitive; access controlled by role+scope.
- Exports require explicit permission and are logged in audit_log.

## Audit Log
- Must include:
  - user_id, tenant_id
  - action type
  - entity_type/entity_id
  - before/after JSON snapshots when feasible
  - timestamp

