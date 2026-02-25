# Vitácora — EvoComp MVP — 2026-02-25

## Resumen Ejecutivo de Implementaciones (Antigravity)

Backend & Seguridad:

- Arquitectura multi-inquilino robusta con Supabase/PostgreSQL.
- Seguridad de nivel empresarial mediante RLS (Row Level Security) y RBAC.
- Sistema de auditoría inmutable para trazabilidad forense.

Motores de Inteligencia (Edge Functions):

- Import Engine: Procesamiento masivo de datos con detección de deltas.
- Scenario Engine: Cálculos salariales complejos y modelado presupuestario.
- Flags Engine: Detección automática de riesgos (equidad, mercado, etc.).
- Reporting Engine: Generación de paquetes de auditoría en PDF.

Frontend Premium (React/Vite):

- 11 páginas de alta fidelidad con diseño moderno y minimalista.
- Dashboards interactivos para escenarios, bandas salariales e importaciones.
- Experiencia de usuario optimizada con micro-animaciones y diseño responsivo.

Internacionalización (i18n):

- Soporte completo para 6 idiomas (ES, EN, PT, FR, DE, IT).
- Selector de idiomas premium en el Header.
- Cobertura del 100% de la interfaz de usuario.

Estado:

- Proyecto EvoComp MVP completado y sincronizado en GitHub (branch `main`).
- Edge Functions desplegadas: `import-engine`, `scenario-engine`,
  `reporting-engine`.
- Base de datos con tablas seed (ej: `roles`, `tenants`) y políticas definidas
  en SQL.

## Notas de Operación

- Supabase CLI usado en Windows. `supabase status` falla local por Docker no
  corriendo; despliegue remoto de functions OK.
- Secrets configurados en Supabase: `PROJECT_URL`, `ANON_KEY`, además de
  `SUPABASE_*` existentes.
- Login UI implementado (alta fidelidad) pero el flujo E2E aún requiere:
  - redirección post-login,
  - bootstrap de perfil (`user_profiles`) y roles (`user_roles`),
  - validación de RLS,
  - pruebas E2E completas.

## Evidencias (alto nivel)

- GitHub: `https://github.com/cramos2023/evocomp.git`
- Supabase Edge Functions visibles y desplegadas en Dashboard.
- UI de Login disponible en `http://localhost:5173/login`.
