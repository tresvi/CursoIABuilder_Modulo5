# Spec FEAT-008: Pipeline CI en GitHub Actions

| Field | Value |
|-------|-------|
| Ticket | FEAT-008 |
| PRD | docs/daw/prd/prd-FEAT-008.md |
| Tier | FEATURE |
| Date | 2026-08-26 |
| Spec loops | 1 |

## Summary

Se agrega `.github/workflows/ci.yml`, un único workflow que dispara en `pull_request` y corre dos
jobs independientes y en paralelo (`frontend`, `backend`) sobre `ubuntu-latest`. Cada job instala
dependencias, corre el linter/format-check correspondiente y corre los tests del stack. No se
tocan `src/frontend` ni `src/backend`: el impact scan confirmó que `dotnet format` ya pasa hoy y
que ningún test hace llamadas HTTP externas reales, así que el único artefacto de este ticket es
el archivo de workflow.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 1 |
| FR-02 | Block 1 |
| FR-03 | Block 1 |
| FR-04 | Block 1 |
| FR-05 | Block 1 |
| FR-06 | Block 1 |
| NFR-01 | Strategy: todas las acciones (`actions/checkout`, `actions/setup-node`, `actions/setup-dotnet`) se pinnean a `@v4` en Block 1, nunca `@latest` |
| NFR-02 | Strategy: verificado en el impact scan de PLAN — ningún test actual hace requests HTTP reales (frontend mockea `fetch`, backend usa `WebApplicationFactory` in-process); el workflow no declara `secrets` ni pasos con red saliente adicional |
| NFR-03 | Strategy: jobs `frontend` y `backend` sin `needs:` entre sí → corren en paralelo en runners `ubuntu-latest` estándar |

## Dependencies between blocks

Ninguna. Un solo bloque, un solo archivo nuevo.

## Block 1 — Workflow de CI (`ci.yml`)

**Files**
- `.github/workflows/ci.yml` (new) — define el trigger `pull_request` y los jobs `frontend` y
  `backend`.

**Logic**

```yaml
name: CI

on:
  pull_request:

permissions:
  contents: read

jobs:
  frontend:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    defaults:
      run:
        working-directory: src/frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: src/frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test

  backend:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "10.0.x"
      - run: dotnet restore src/backend/ECGViewer.sln
      - run: dotnet format src/backend/ECGViewer.sln --verify-no-changes
      - run: dotnet test src/backend/ECGViewer.sln
```

**Mitigaciones de threat modeling (ver `docs/daw/security/threat-FEAT-008.md`):**
- `permissions: contents: read` a nivel workflow — el `GITHUB_TOKEN` por defecto puede tener
  permisos de escritura si así está configurado el repo; el pipeline de CI no necesita escribir
  nada, así que se fuerza el mínimo privilegio explícitamente (mitiga elevación de privilegio si un
  paso resultara comprometido).
- `timeout-minutes: 10` en ambos jobs — acota el tiempo máximo de ejecución para que un PR
  malicioso (de un fork) que intente correr un loop infinito o minado de criptomonedas en un test
  no consuma minutos de Actions indefinidamente (mitigación de Denial of Service), reforzando
  además el límite de NFR-03.

Notas de implementación:
- El job `frontend` fija `working-directory: src/frontend` a nivel job (vía `defaults.run`) para
  que `npm ci`, `npm run lint` y `npm test` corran en esa carpeta sin repetir `cd` en cada paso.
- El job `backend` apunta directo al `.sln` (`src/backend/ECGViewer.sln`), que ya referencia
  `ECGViewer.Api.csproj` y `ECGViewer.Tests.csproj` — un solo `restore`/`format`/`test` cubre
  ambos proyectos.
- `actions/setup-node@v4` con `cache: npm` y `cache-dependency-path` apuntando al lockfile
  correcto habilita el caching nativo de dependencias sin configuración adicional (Out of Scope
  del PRD excluye caching *avanzado*, pero el caching nativo del action no lo es).
- No se declara ningún `env:` ni `secrets:` en ningún paso — cumple FR-06/AC-05.
- `dotnet-version: "10.0.x"` sigue el floating minor/patch oficial de `setup-dotnet`, consistente
  con el .NET 10 declarado en `AGENTS.md`; no depende de `global.json` (que no fija SDK version,
  según el impact scan).

**API contract**

No aplica — este bloque no crea ni modifica ningún endpoint.

**Data model**

No aplica.

**Input validation**

No aplica — el workflow no acepta input de usuario más allá del propio evento `pull_request` de
GitHub.

**Error handling**

- Si `npm run lint` o `npm test` fallan → el job `frontend` termina con exit code distinto de 0 →
  GitHub marca el check `frontend` como fallido (AC-03).
- Si `dotnet format --verify-no-changes` encuentra diffs, o `dotnet test` falla → el job `backend`
  termina con exit code distinto de 0 → GitHub marca el check `backend` como fallido (AC-03).
- Ninguno de los dos jobs tiene `continue-on-error`, así que un fallo en cualquier paso detiene el
  resto de los pasos de ese job (comportamiento default de GitHub Actions).

**Required tests**

- [ ] Abrir un PR de prueba contra este branch y verificar que aparecen los dos checks
      (`frontend`, `backend`) corriendo — valida AC-01.
- [ ] Verificar en los logs del run que ambos jobs arrancan en paralelo (sin esperarse entre sí,
      timestamps de inicio solapados) — valida AC-02, NFR-03.
- [ ] Confirmar que el job `backend` termina en verde sin modificar código (dado que
      `dotnet format --verify-no-changes` ya pasa hoy según el impact scan) — valida AC-01, AC-03.
- [ ] Confirmar que el job `frontend` termina en verde sin modificar código — valida AC-01, AC-03.
- [ ] Revisar en los logs del step `actions/setup-node` y `actions/setup-dotnet` que efectivamente
      resuelven Node 22 y .NET 10.0.x (no otra versión por defecto del runner) — valida AC-04.
- [ ] Introducir temporalmente un error de lint en `src/frontend` en una rama de prueba y verificar
      que el check `frontend` se marca como fallido MIENTRAS el check `backend` permanece en verde
      (jobs independientes) — valida AC-03 (caso rojo, frontend).
- [ ] Introducir temporalmente un test roto en `src/backend` en una rama de prueba y verificar que
      el check `backend` se marca como fallido MIENTRAS el check `frontend` permanece en verde —
      valida AC-03 (caso rojo, backend).
- [ ] Revisar el YAML final y confirmar que ningún step referencia `secrets.*` ni variables de
      entorno no declaradas en el propio workflow — valida FR-06, AC-05.
- [ ] Confirmar que las tres acciones de terceros (`actions/checkout`, `actions/setup-node`,
      `actions/setup-dotnet`) están pineadas a `@v4`, no a `@latest` ni a un branch — valida
      NFR-01.
- [ ] Confirmar (ya verificado en el impact scan de PLAN, re-chequear si el código cambió) que
      ningún test de `src/frontend` ni `src/backend` hace una llamada HTTP real no mockeada —
      valida AC-06, NFR-02.
- [ ] Confirmar que el workflow declara `permissions: contents: read` a nivel raíz — mitiga el
      riesgo de elevación de privilegio identificado en threat modeling.
- [ ] Confirmar que ambos jobs declaran `timeout-minutes: 10` — mitiga el riesgo de Denial of
      Service (PR malicioso ejecutando un loop infinito) identificado en threat modeling.

**Completion criterion**

Un Pull Request de prueba dispara el workflow, corren los jobs `frontend` y `backend` en paralelo,
ambos terminan en verde sin haber requerido cambios en `src/frontend` ni `src/backend`, y forzando
un fallo en cada job por separado el check correspondiente se marca en rojo mientras el otro
permanece en verde.

## Final verification

- El archivo `.github/workflows/ci.yml` existe, es YAML válido, y GitHub lo reconoce como workflow
  (aparece en la pestaña "Actions" del repo tras el push).
- Un PR real contra `main` dispara ambos checks automáticamente.
- Ningún secreto ni variable de entorno externa es requerida para que el pipeline complete.
- El pipeline completo (ambos jobs en paralelo) termina en menos de 10 minutos (NFR-03).
