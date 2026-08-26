# SAST Report FEAT-008: Pipeline CI en GitHub Actions

| Field | Value |
|-------|-------|
| Ticket | FEAT-008 |
| Date | 2026-08-26 |
| Scope | `.github/workflows/ci.yml` (único archivo del ticket) + dependencias existentes de front/back |

## Secrets (F-SAST-01)

- ✅ Grep de `secret|token|password|api[_-]?key` sobre `.github/workflows/ci.yml`: sin coincidencias.
- ✅ El workflow no declara ningún bloque `env:` ni `secrets.*`.
- ✅ `.env` ya está contemplado por convención del proyecto (AGENTS.md: `ANTHROPIC_API_KEY` va en
  `.env`); este ticket no introduce ninguna variable nueva.

## Injection — expresiones de GitHub Actions inyectables

- ✅ Grep de `\${{` sobre el workflow: sin coincidencias. No hay interpolación de contexto de
  GitHub (`github.event.pull_request.title`, `github.head_ref`, etc.) dentro de ningún paso
  `run:`, que es el vector de inyección de comandos más común en workflows de Actions (un actor
  malicioso controla el título/branch de su propia PR e inyecta shell si ese valor se interpola
  sin comillas en un script). Este workflow no interpola ningún valor de contexto en `run:` — solo
  ejecuta comandos fijos (`npm ci`, `dotnet test`, etc.) — por lo tanto no aplica.
- ✅ No hay `pull_request_target` (el trigger más riesgoso al combinarse con checkout de código de
  un fork + secrets); se usa `pull_request` simple, que ya restringe permisos y no expone secrets
  a PRs de forks por defecto (documentado también en el threat model de PLAN).

## XSS y funciones inseguras

- No aplica: no hay código de aplicación (frontend/backend) en el diff de este ticket.

## SSRF / debug mode / logging sensible / upload / CSRF

- No aplica: el workflow no expone ningún servicio, no maneja uploads, no genera logs de
  aplicación — solo orquesta `npm`/`dotnet`.

## Permisos y superficie de ataque (cubierto también en threat modeling de PLAN)

- ✅ `permissions: contents: read` explícito a nivel workflow — mínimo privilegio.
- ✅ `timeout-minutes: 10` en ambos jobs — acota agotamiento de recursos.
- ✅ Las 3 acciones de terceros están pineadas a `@v4` (no `@latest`, no branch flotante):
  `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-dotnet@v4`.

## Dependencias (F-SAST-13/16)

- ✅ `npm audit --omit=dev` en `src/frontend`: **0 vulnerabilidades**.
- ✅ `dotnet list ECGViewer.sln package --vulnerable --include-transitive` en `src/backend`:
  **sin paquetes vulnerables** en `ECGViewer.Api` ni `ECGViewer.Tests`.

## Suppressions

Ninguna. No hay hallazgos Medium que documentar como riesgo aceptado — el único riesgo aceptado de
este ticket (pin de acciones por tag, no por SHA) es Low/Informational y ya quedó documentado con
sus 3 campos en `docs/daw/security/threat-FEAT-008.md` (threat modeling de PLAN, no un hallazgo de
SAST).

---

**Total: 12 clean, 0 vulnerabilidades (0 critical, 0 high, 0 medium).**
**Result: PASSED**
