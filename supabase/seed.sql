-- EvoComp Phase 1: Seed Data

-- 1. Roles
INSERT INTO public.roles (id, name) VALUES
('TENANT_ADMIN', 'Tenant Administrator'),
('COMP_ADMIN', 'Compensation Administrator'),
('ANALYST', 'Compensation Analyst'),
('EXECUTIVE', 'Executive Viewer'),
('VIEWER', 'General Viewer'),
('AUDITOR', 'Audit Reviewer')
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Tenant
INSERT INTO public.tenants (name, base_currency, mode)
VALUES ('Demo Corp', 'USD', 'SYSTEM_OF_RECORD')
ON CONFLICT DO NOTHING;

-- 3. Note: In a real app, the first user would be assigned TENANT_ADMIN manually 
-- or via a registration flow that creates the tenant and the profile together.
