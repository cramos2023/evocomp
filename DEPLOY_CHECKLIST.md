# EvoComp Merit Review – Deployment Checklist

## Archivos entregados en este PR

| Archivo | Tipo | Descripción |
|---|---|---|
| `supabase/migrations/0003_merit_review_schema.sql` | Migración | Schema de `scenario_runs`, campos merit en results/snapshots/pay_bands |
| `supabase/functions/scenario-engine/index.ts` | Edge Function | Motor MERIT_REVIEW + backward compat GENERAL |
| `src/pages/MeritScenarioBuilderModal.tsx` | Frontend | Wizard 3-pasos para crear escenario Merit Review |
| `src/pages/MeritResultsPage.tsx` | Frontend | Resultados: panel budget + tabla empleados + calidad |
| `src/pages/ScenariosPage.tsx` | Frontend | Badges de tipo, navegación a resultados |
| `src/pages/PayBandsPage.tsx` | Frontend | Columnas corregidas, filtro basis_type, modal crear banda |
| `src/App.tsx` | Frontend | Ruta `/app/comp/scenarios/:scenarioId/results` |
| `src/i18n/locales/*/common.json` | i18n | Claves merit en ES, EN, FR, DE, PT, IT |
| `scripts/verify_merit_matrix.js` | Test | 8 casos de aceptación (todos pasan) |

---

## Paso 1 — Aplicar migración en Supabase

**Opción A: Dashboard SQL Editor** (recomendado si no tienes CLI)
1. Ir a https://app.supabase.com → tu proyecto → SQL Editor
2. Pegar el contenido de `supabase/migrations/0003_merit_review_schema.sql`
3. Ejecutar

**Opción B: Supabase CLI**
```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

**Qué hace la migración:**
- Agrega `scenario_type` y `rules_json` a `scenarios`
- Crea tabla `scenario_runs` (append-only con trigger de auto-numeración)
- Agrega campos merit a `scenario_employee_results`
- Agrega campos merit a `snapshot_employee_data` (hours_per_week, target_cash_local, etc.)
- Agrega `basis_type`, `country_code`, `currency` a `pay_bands`
- RLS + indexes para `scenario_runs`

---

## Paso 2 — Verificar secrets de Edge Functions

Los siguientes env vars son **auto-inyectados** por Supabase en todas las Edge Functions:

| Variable | Fuente |
|---|---|
| `SUPABASE_URL` | Auto-inyectado |
| `SUPABASE_ANON_KEY` | Auto-inyectado |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-inyectado |

> No se requiere configuración manual de secrets para el scenario-engine.
> Verificar en: Dashboard → Edge Functions → scenario-engine → Logs

---

## Paso 3 — Deploy Edge Functions

```bash
# Desde tu máquina local con Supabase CLI instalado:
supabase functions deploy scenario-engine
supabase functions deploy import-engine
supabase functions deploy reporting-engine
```

---

## Paso 4 — Variables de entorno del Frontend

En tu proveedor de hosting (Vercel / Netlify / Cloudflare Pages):

```
VITE_SUPABASE_URL=https://TU_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Para desarrollo local, crear/actualizar `.env.local`:
```
VITE_SUPABASE_URL=https://TU_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

---

## Paso 5 — Tests de aceptación (opcional, sin Supabase)

```bash
node scripts/verify_merit_matrix.js
```

Salida esperada:
```
✓ FE compa=0.70 (BELOW_MIN) → 60%
✓ FE compa=0.90 (BELOW_MID) → 50%
✓ FE compa=1.10 (ABOVE_MID) → 40%
✓ FE compa=1.30 (ABOVE_MAX) → 20%
✓ E  compa=1.10 (ABOVE_MID) → 30%
✓ FM compa=1.30 (ABOVE_MAX) →  0%
✓ PM compa=0.70             →  0%
✓ DNM any                   →  0%
RESULTS: 8 passed, 0 failed
```

---

## Paso 6 — Verificación end-to-end en la app

1. **Crear Bandas Salariales** → Bandas Salariales → "+ Crear Banda"
   - Agrega una banda: Grade=`G5`, Basis=`BASE_SALARY`, Min=50000, Mid=70000, Max=90000

2. **Importar Snapshot** → Importaciones → subir CSV con empleados que tengan:
   - `employee_external_id`, `pay_grade_internal` (ej. `G5`), `performance_rating` (ej. `FE`)
   - `base_salary_local`, `hours_per_week` (default=40 si no se incluye)

3. **Crear Escenario Merit Review** → Escenarios → "+ Nuevo Escenario"
   - Tipo: Merit Review (se selecciona automáticamente)
   - Budget: `20` (%), Step Factor: `0.50`
   - Ver Matrix Preview en paso 3 del wizard

4. **Ejecutar Run** → Click en "Ejecutar" en la página de Resultados

5. **Verificar:**
   - Panel budget: Total Referencia, Presupuesto Aprobado, Total Aplicado, Estado
   - Tabla de empleados con compa_ratio, zona, % guía, aumento
   - Reporte de calidad con conteos de issues

6. **Audit Log** → Registro de Auditoría → buscar acción `RUN_MERIT_REVIEW`

---

## Casos de aceptación (spec §7)

| Rating | Compa | Zona | Guideline esperada |
|---|---|---|---|
| FE | 0.70 | BELOW_MIN | 60% |
| FE | 0.90 | BELOW_MID | 50% |
| FE | 1.10 | ABOVE_MID | 40% |
| FE | 1.30 | ABOVE_MAX | 20% |
| E  | 1.10 | ABOVE_MID | 30% |
| FM | 1.30 | ABOVE_MAX |  0% |
| PM | any  | any  |  0% |
| DNM| any  | any  |  0% |

Flags de calidad:
- Sin `band_mid` → flag `MISSING_BAND`, increase=0
- Rating no reconocido → flag `INVALID_RATING`, increase=0
- `hours_per_week` ≤ 0 o > 168 → flag `INVALID_HOURS`, increase=0
- Determinismo: mismos inputs → mismos outputs (ORDER BY employee_external_id, id)

---

## Extensiones futuras preparadas (no implementadas)

Estos hooks están listos en el schema/rules_json para fases posteriores:

- `lump_sum_amount` en results → listo para reglas over-max
- `proposed_pct` → se puede añadir para workflow de propuestas
- `fte_hours_standard` en rules → soporte multi-FTE
- `triggered_by` en scenario_runs → workflow de aprobaciones
- `multiplier_matrix` en rules_json → Opción A (matriz explícita) ya soportada
- `two_step` flag en rules_json → Merit en 2 pasos (step1/step2)
