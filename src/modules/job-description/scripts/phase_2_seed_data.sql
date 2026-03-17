-- Idempotent Phase 2 Validation Seed Pack
-- Target Tenant: 00000000-0000-0000-0000-000000000000
-- This script prepares specific scenarios for deterministic testing of the Compensation Intelligence Engine.

BEGIN;

-- 1. Setup Validation Tenant
INSERT INTO tenants (id, name, base_currency)
VALUES ('00000000-0000-0000-0000-000000000000', 'Phase 2 Validation Corp', 'USD')
ON CONFLICT (id) DO NOTHING;

-- Cleanup existing data for this tenant to ensure idempotency
DELETE FROM snapshot_employee_data WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM employee_compensation WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM employees WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM pay_bands WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- 2. Setup Pay Bands
INSERT INTO pay_bands (tenant_id, grade, country_code, min_salary, midpoint, max_salary, basis_type, effective_year, effective_month, currency)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'L10', 'US', 50000, 60000, 70000, 'base_salary', 2026, 1, 'USD'),
  ('00000000-0000-0000-0000-000000000000', 'L11', 'US', 60000, 70000, 80000, 'base_salary', 2026, 1, 'USD'),
  ('00000000-0000-0000-0000-000000000000', 'L12', 'US', 80000, 90000, 100000, 'base_salary', 2026, 1, 'USD'),
  ('00000000-0000-0000-0000-000000000000', 'L14', 'US', 120000, 130000, 140000, 'base_salary', 2026, 1, 'USD');

-- 3. Setup Market Data
-- Note: Market matching is hierarchical (Family -> Function -> Default)
DELETE FROM market_pay_data WHERE country_code = 'US' AND vendor_level_code IN ('L10', 'L11', 'L12', 'L14') AND vendor_job_title LIKE '%VAL_TEST%';

INSERT INTO market_pay_data (tenant_id, country_code, vendor_level_code, vendor_job_title, base_salary_p50, currency, provider, import_id, market_effective_date)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'US', 'L11', 'Eng_Family VAL_TEST', 85000, 'USD', 'MERCER', '4f45c819-2dcc-4fa4-af05-ddab51e9eb2f', '2026-01-01'),
  ('00000000-0000-0000-0000-000000000000', 'US', 'L10', 'Any VAL_TEST', 60000, 'USD', 'MERCER', '4f45c819-2dcc-4fa4-af05-ddab51e9eb2f', '2026-01-01'),
  ('00000000-0000-0000-0000-000000000000', 'US', 'L12', 'Any VAL_TEST', 90000, 'USD', 'MERCER', '4f45c819-2dcc-4fa4-af05-ddab51e9eb2f', '2026-01-01');

-- 4. Setup Employees & Compensation

-- CASE 1: BELOW_BAND
INSERT INTO employees (id, tenant_id, full_name, employee_external_id, job_level_internal, job_family, country_code, status)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'John Below', 'EXT_111', 'L10', 'Eng_Family VAL_TEST', 'US', 'ACTIVE');

INSERT INTO employee_compensation (id, tenant_id, employee_id, base_salary_local, base_salary_base, local_currency, effective_date)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 45000, 45000, 'USD', '2026-01-01');

-- CASE 2: IN_RANGE_MID
INSERT INTO employees (id, tenant_id, full_name, employee_external_id, job_level_internal, job_family, country_code, status)
VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'Jane Mid', 'EXT_222', 'L12', 'Eng_Family VAL_TEST', 'US', 'ACTIVE');

INSERT INTO employee_compensation (id, tenant_id, employee_id, base_salary_local, base_salary_base, local_currency, effective_date)
VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 90000, 90000, 'USD', '2026-01-01');

-- CASE 3: ABOVE_BAND
INSERT INTO employees (id, tenant_id, full_name, employee_external_id, job_level_internal, job_family, country_code, status)
VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'Bob Above', 'EXT_333', 'L14', 'Eng_Family VAL_TEST', 'US', 'ACTIVE');

INSERT INTO employee_compensation (id, tenant_id, employee_id, base_salary_local, base_salary_base, local_currency, effective_date)
VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 150000, 150000, 'USD', '2026-01-01');

-- CASE 4: LAGGING Market
INSERT INTO employees (id, tenant_id, full_name, employee_external_id, job_level_internal, job_family, country_code, status)
VALUES ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'Alice Lagging', 'EXT_444', 'L11', 'Eng_Family VAL_TEST', 'US', 'ACTIVE');

INSERT INTO employee_compensation (id, tenant_id, employee_id, base_salary_local, base_salary_base, local_currency, effective_date)
VALUES ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 65000, 65000, 'USD', '2026-01-01');

-- CASE 5: COMPRESSION
-- Manager
INSERT INTO employees (id, tenant_id, full_name, employee_external_id, job_level_internal, job_family, country_code, status)
VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'Manager Mike', 'EXT_555', 'L12', 'Eng_Family VAL_TEST', 'US', 'ACTIVE');

INSERT INTO employee_compensation (id, tenant_id, employee_id, base_salary_local, base_salary_base, local_currency, effective_date)
VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 100000, 100000, 'USD', '2026-01-01');

-- Subordinate
INSERT INTO employees (id, tenant_id, full_name, employee_external_id, job_level_internal, job_family, country_code, status)
VALUES ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'Subordinate Sam', 'EXT_666', 'L11', 'Eng_Family VAL_TEST', 'US', 'ACTIVE');

INSERT INTO employee_compensation (id, tenant_id, employee_id, base_salary_local, base_salary_base, local_currency, effective_date)
VALUES ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 98000, 98000, 'USD', '2026-01-01');

-- Peering Data
INSERT INTO employees (id, tenant_id, full_name, employee_external_id, job_level_internal, job_family, country_code, status)
VALUES ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'Peer Pete', 'EXT_777', 'L11', 'Eng_Family VAL_TEST', 'US', 'ACTIVE');

INSERT INTO employee_compensation (id, tenant_id, employee_id, base_salary_local, base_salary_base, local_currency, effective_date)
VALUES ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777', 68000, 68000, 'USD', '2026-01-01');

INSERT INTO employees (id, tenant_id, full_name, employee_external_id, job_level_internal, job_family, country_code, status)
VALUES ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'Peer Pam', 'EXT_888', 'L11', 'Eng_Family VAL_TEST', 'US', 'ACTIVE');

INSERT INTO employee_compensation (id, tenant_id, employee_id, base_salary_local, base_salary_base, local_currency, effective_date)
VALUES ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', '88888888-8888-8888-8888-888888888888', 72000, 72000, 'USD', '2026-01-01');

-- 5. Integration for Compression Testing (Snapshots)
INSERT INTO snapshots (id, tenant_id, name, snapshot_date)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'Phase 2 Validation Snapshot', '2026-01-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO snapshot_employee_data (id, tenant_id, snapshot_id, employee_id, full_name, base_salary_local, base_salary_base, country_code, local_currency, manager_id)
VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Manager Mike', 100000, 100000, 'US', 'USD', NULL);

INSERT INTO snapshot_employee_data (id, tenant_id, snapshot_id, employee_id, full_name, base_salary_local, base_salary_base, country_code, local_currency, manager_id)
VALUES ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'Subordinate Sam', 98000, 98000, 'US', 'USD', '55555555-5555-5555-5555-555555555555');

-- 6. Positions
INSERT INTO positions (position_id, tenant_id, company_code, position_code, position_title, classification_level, family_code, function_code, sequence_number)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'VAL_CORP', 'POS_111', 'Engineering Specialist VAL_TEST', 'L12', 'Eng_Family VAL_TEST', 'Engineering', 1);

COMMIT;
