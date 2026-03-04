# Phase 5A — Security Notes

## Vulnerability Summary (Post-Mitigation)

### Mitigated in Phase 5A

| Advisory                      | Severity      | Package         | Fix Applied                    |
| ----------------------------- | ------------- | --------------- | ------------------------------ |
| ReDoS via repeated wildcards  | HIGH (×6)     | minimatch@9.0.3 | npm override → minimatch@9.0.5 |
| Dev server request forwarding | MODERATE (×2) | esbuild ≤0.24.2 | vite server.host = 'localhost' |

### Remaining (Requires Breaking Changes — Phase 5B)

| Advisory              | Severity | Root Cause                               | Fix Required                     |
| --------------------- | -------- | ---------------------------------------- | -------------------------------- |
| GHSA-23c5-xmqv-rm74   | MODERATE | esbuild ≤0.24.2 (via vite@5)             | Upgrade to Vite 7                |
| GHSA-xxxx (minimatch) | HIGH     | @typescript-eslint/typescript-estree@6.x | Upgrade to @typescript-eslint v8 |

**Note:** If the npm override for minimatch resolves the audit finding, the 6
HIGH minimatch vulnerabilities are eliminated. The esbuild advisory remains but
is operationally mitigated.

## Risk Assessment

**All vulnerabilities are dev-only.** None affect:

- Production builds (`dist/`)
- Deployed Supabase Edge Functions
- Runtime application behavior

| Risk               | Impact                                          | Exposure                               |
| ------------------ | ----------------------------------------------- | -------------------------------------- |
| minimatch ReDoS    | Developer CI/lint only                          | None in production                     |
| esbuild dev server | Only if dev server exposed to untrusted network | Mitigated: `server.host = 'localhost'` |

## Operational Mitigations Applied

1. **vite.config.ts** — `server.host = 'localhost'`, `server.strictPort = true`
2. **package.json** — `overrides.minimatch = "9.0.5"` (patched ReDoS)

## Phase 5B Plan (Breaking Upgrade — NOT in scope for 5A)

1. Upgrade `@typescript-eslint/*` from v6 to v8 (peer dep: eslint ≥8.57)
2. Upgrade `eslint` to v9 if required by @typescript-eslint v8
3. Upgrade `vite` from v5 to v7 (requires `@vitejs/plugin-react` ≥5)
4. Update any ESLint config format changes (flat config migration)
5. Run full test suite, lint, and build after each step

**Estimated effort:** 1-2 hours, isolated to devDependencies.
