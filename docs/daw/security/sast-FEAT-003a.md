# SAST FEAT-003a: Crear y listar marcadores de evento (RF-03)

| Field | Value |
|-------|-------|
| Ticket | FEAT-003a |
| Date | 2026-08-23 |

## Alcance

Archivos nuevos/modificados en `src/frontend/src` (Blocks 1-6 de `spec-FEAT-003a.md`):
`ChartToolbar.tsx`, `ECGChart.tsx`, `MarkerForm.tsx`, `MarkerList.tsx`, `ui/dialog.tsx`,
`markersStore.ts`, `drawMarkers.ts`, `drawChart.ts`, `scale.ts`, `zoom.ts`, `types.ts`,
`viewStore.ts`, `format.ts`, `App.tsx`, más las nuevas dependencias `@radix-ui/react-dialog` y
`lucide-react`.

## Secrets

- ✅ F-SAST-01: sin patrones de API key/password/token hardcodeados en ningún archivo del alcance
  (grep sin resultados).
- ✅ `.env` en `.gitignore` (raíz y `src/frontend/.gitignore`).

## Injection

- ✅ F-SAST-02/03: sin queries SQL/NoSQL ni llamadas a `exec`/`spawn`/`system` — este ticket es
  front-end puro, sin backend nuevo.
- ✅ F-SAST-05: sin uso de input de usuario en paths de filesystem.

## XSS y funciones inseguras

- ✅ F-SAST-06: sin `dangerouslySetInnerHTML` ni `.innerHTML =` en ningún archivo del alcance (grep
  confirmado; las únicas coincidencias son comentarios que documentan la mitigación, no código real).
  `MarkerList.tsx` renderiza `label` vía interpolación JSX estándar; `drawMarkers.ts` usa
  `ctx.fillText` (API de texto de Canvas) para el texto de los marcadores — mitigación del threat
  model (`docs/daw/security/threat-FEAT-003a.md`) implementada y cubierta por tests explícitos
  (`MarkerList.test.tsx`, `drawMarkers.test.ts`).
- ✅ F-SAST-04/17: sin `eval()`, `new Function()` ni deserialización insegura.
- ✅ F-SAST-08: sin criptografía (no aplica a este ticket).

## Resto de categorías mandatorias

- ✅ F-SAST-07 (SSRF): no aplica, sin llamadas HTTP nuevas.
- ✅ F-SAST-09 (debug mode): no aplica, sin configuración de servidor.
- ✅ F-SAST-10 (logging sensible): sin `console.log`/`console.debug` en código de producción (grep
  confirmado).
- ✅ F-SAST-11 (upload sin restricción): no aplica, sin upload nuevo en este ticket.
- ✅ F-SAST-12 (CSRF): no aplica, sin operaciones state-changing contra un backend.
- ✅ F-SAST-14 (validación de input incompleta): `MarkerForm` valida `maxLength={200}` en el campo de
  etiqueta (documentado y testeado en Block 4); `markersStore.addMarker` normaliza `label` vacío/solo
  espacios a `null`.
- ✅ F-SAST-15 (manejo de errores inseguro): sin catches genéricos que expongan detalles internos en
  el código de este ticket.

## Dependencias (F-SAST-13/16)

- `npm audit` inicial: 1 hallazgo **High** — `nanoid@3.3.17` (CWE-835, GHSA-2v37-7h3g-55p8),
  transitivo de `postcss` (toolchain de build de Vite/Tailwind), **preexistente en `main`** (el SAST
  de FEAT-002 corrió con "0 vulnerabilidades" — el CVE se publicó después de ese cierre; no fue
  introducido por las dependencias nuevas de este ticket, `@radix-ui/react-dialog` ni
  `lucide-react`).
- Acción: `npm audit fix` (bump de parche dentro del rango declarado en `package.json`, sin cambios
  breaking). Re-ejecutado `npm audit` → **0 vulnerabilidades**.
- Verificado post-fix: `npm run typecheck` limpio, `npm run lint` limpio, suite completa 100/100
  tests verdes — el bump no rompió nada.
- `@radix-ui/react-dialog@1.1.4` y `lucide-react@0.469.0`: sin CVEs conocidas a la fecha, versiones
  exactas fijadas en `package.json`/`package-lock.json`.

## Suppressions

Ninguna. El único hallazgo (High, nanoid) se corrigió en lugar de suprimirse.

## Resultado

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│  Secrets:            ✅ F-SAST-01                              │
│  Injection:           ✅ F-SAST-02/03/05 (no aplica, front-end)│
│  XSS / unsafe fns:     ✅ F-SAST-04/06/08/17                    │
│  Resto mandatorias:    ✅ F-SAST-07/09/10/11/12/14/15            │
│  Dependencias:         ✅ F-SAST-13 (nanoid High → fixed vía     │
│                           npm audit fix, re-scan 0 vulns)        │
│  Suppressions: 0                                                 │
│  ────────────────────────────────────────────────────────────│
│  Total: 0 vulnerabilidades abiertas (0 critical, 0 high tras fix)│
│  Report: docs/daw/security/sast-FEAT-003a.md                    │
│  Next: cerrar CODE (gates tests+sast) y pasar a VERIFY           │
└─────────────────────────────────────────────────────────────┘
```
