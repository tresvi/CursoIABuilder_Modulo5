# Threat Model FEAT-008: Pipeline CI en GitHub Actions

| Field | Value |
|-------|-------|
| Ticket | FEAT-008 |
| Spec | docs/daw/specs/spec-FEAT-008.md |
| Date | 2026-08-26 |

## Componentes y superficies de ataque

El único componente nuevo es `.github/workflows/ci.yml`, un workflow de GitHub Actions con:

- **Trigger**: `pull_request` (cualquier rama base, incluidas PRs desde forks).
- **Job `frontend`**: corre en `ubuntu-latest`, ejecuta `npm ci` (instala dependencias de
  `src/frontend/package-lock.json`, lo cual corre `install` scripts de paquetes de terceros),
  `npm run lint`, `npm test` (código de test del propio repo).
- **Job `backend`**: corre en `ubuntu-latest`, ejecuta `dotnet restore`/`format`/`test` sobre
  `src/backend/ECGViewer.sln`.
- **Acciones de terceros consumidas**: `actions/checkout@v4`, `actions/setup-node@v4`,
  `actions/setup-dotnet@v4` (las tres mantenidas por GitHub).

**Trust boundaries declarados:**
1. **PR de un fork externo ↔ runner de GitHub Actions.** El código de la PR (incluyendo
   `package.json`/dependencias con install scripts, y el propio código de tests) se ejecuta dentro
   del runner. Con el trigger `pull_request` (no `pull_request_target`), GitHub ya restringe por
   defecto el `GITHUB_TOKEN` a permisos de solo lectura y no expone `secrets.*` a PRs de forks —
   esto es una protección de la plataforma, no del workflow, pero el diseño la respeta al no
   declarar ningún `secrets.*`.
2. **Workflow ↔ acciones de terceros (`actions/*`).** Cadena de suministro: el workflow confía en
   que la versión resuelta de `actions/checkout@v4`, etc. es la publicada por GitHub y no una
   versión comprometida.
3. **Runner ↔ recursos de Actions del repo (minutos de cómputo).** Un job sin límite de tiempo es
   un vector de agotamiento de recursos si el código de la PR contiene un loop infinito.

## Análisis STRIDE

| Categoría | Pregunta | Aplica |
|---|---|---|
| Spoofing | ¿Se puede suplantar una identidad? | No aplica: no hay autenticación/autorización nueva; la identidad del actor (autor de la PR) la gestiona GitHub. |
| Tampering | ¿Se pueden modificar datos en tránsito o en reposo? | No aplica: el workflow no persiste ni transmite datos de negocio; solo ejecuta build/test. |
| Repudiation | ¿Se puede negar una acción? ¿Hay logging? | Cubierto por GitHub Actions: cada run queda registrado con autor, commit y logs completos — no se requiere logging adicional. |
| Information Disclosure | ¿Se expone información sensible? | Riesgo bajo: no hay secretos declarados (NFR-02/FR-06 del PRD). El único dato "sensible" serían logs de build, que no contienen credenciales. |
| Denial of Service | ¿Se puede degradar o tumbar el servicio? | 🟠 **Riesgo real**: un PR (potencialmente de un fork) puede incluir un test con loop infinito o un `postinstall` script pesado, agotando minutos de Actions del repo sin límite, ya que ningún job declaraba `timeout-minutes`. |
| Elevation of Privilege | ¿Se pueden escalar privilegios? | 🟠 **Riesgo real**: sin un bloque `permissions:` explícito, el workflow hereda el nivel de permisos por defecto configurado a nivel repositorio/organización para `GITHUB_TOKEN`, que puede ser más amplio (ej. `write` sobre contents/PRs) de lo que este pipeline necesita (que es ninguno). |

## Riesgos identificados

| Risk | STRIDE | Likelihood | Impact | Mitigación propuesta |
|---|---|---|---|---|
| Job sin límite de tiempo permite agotar minutos de Actions con un PR malicioso (loop infinito, script pesado) | Denial of Service | Medium | Medium | `timeout-minutes: 10` en ambos jobs (ya alineado con NFR-03 del PRD) |
| `GITHUB_TOKEN` con permisos por defecto más amplios de lo necesario | Elevation of Privilege | Low | Medium | Declarar `permissions: contents: read` a nivel workflow (el pipeline solo necesita leer el código) |
| Acciones de terceros pineadas por tag mutable (`@v4`) en vez de SHA de commit | Tampering (supply chain) | Low | Low | **Riesgo aceptado** (ver abajo) |

Ningún riesgo clasifica como CRITICAL o HIGH — los dos primeros (MEDIUM) ya quedaron mitigados en
el spec (bloque `permissions:` y `timeout-minutes:` incorporados antes de escribir el spec final).

### Riesgo aceptado: pin de acciones por tag mayor, no por SHA

- **Quién lo acepta:** el equipo de este proyecto, vía esta revisión de PLAN (FEAT-008).
- **Justificación:** las tres acciones usadas (`actions/checkout`, `actions/setup-node`,
  `actions/setup-dotnet`) son mantenidas oficialmente por GitHub, con buen historial de seguridad
  y sin incidentes de tag-jacking conocidos. Pinnear por SHA de commit añade fricción de
  mantenimiento (hay que actualizar el hash manualmente en cada bump) que no se justifica para
  acciones del propio proveedor de la plataforma — a diferencia de acciones de terceros no
  oficiales, donde sí sería obligatorio. NFR-01 del PRD ya excluye explícitamente `@latest` y
  branches flotantes, que es el riesgo de mayor probabilidad real.
- **Condiciones de revisión:** si en el futuro se agrega una acción de un mantenedor no-GitHub al
  workflow, ese caso puntual debe pinnearse por SHA de commit, no por tag — este riesgo aceptado
  cubre únicamente las tres acciones oficiales listadas arriba.

## Datos sensibles

No se identifican datos PII, credenciales ni datos financieros en el diseño. El workflow no
declara `secrets.*` ni maneja variables de entorno con información sensible (cumple FR-06 del
PRD). No aplica cifrado en tránsito/reposo (F-TM-07) porque no hay datos sensibles que cifrar.

## Mitigaciones incorporadas al spec

1. `permissions: contents: read` a nivel workflow — ya incorporado en `spec-FEAT-008.md` Block 1.
2. `timeout-minutes: 10` en los jobs `frontend` y `backend` — ya incorporado en
   `spec-FEAT-008.md` Block 1.
3. Riesgo de pin por tag (no SHA) — aceptado explícitamente arriba, sin cambio de diseño.

---

**Resultado: PASSED.** Riesgos: C:0 H:0 M:2 (mitigados) L:1 (aceptado).
