# SAST FEAT-003b: Editar y eliminar marcadores de evento (RF-04/05)

| Field | Value |
|-------|-------|
| Ticket | FEAT-003b |
| Date | 2026-08-23 |

## Alcance

Archivos nuevos/modificados en `src/frontend/src` (Blocks 1-5 de `spec-FEAT-003b.md`):
`markersStore.ts`, `MarkerForm.tsx`, `ECGChart.tsx`, `MarkerList.tsx`, `ConfirmDialog.tsx` (nuevo),
`App.tsx`. Sin dependencias nuevas en este ticket (reusa `@radix-ui/react-dialog` ya instalado en
FEAT-003a).

## Secrets

- ✅ F-SAST-01: sin patrones de API key/password/token hardcodeados (grep sin resultados).
- ✅ `.env` sigue en `.gitignore` (sin cambios respecto a FEAT-003a).

## Injection

- ✅ F-SAST-02/03/05: no aplica — sin queries, sin backend, sin filesystem tocado.

## XSS y funciones inseguras

- ✅ F-SAST-06: sin `dangerouslySetInnerHTML` ni `.innerHTML =` en ningún archivo del alcance (grep
  confirmado; únicas coincidencias son comentarios documentando la mitigación). `ConfirmDialog`
  renderiza `description` (que puede contener la etiqueta del marcador a eliminar) vía interpolación
  JSX estándar — mitigación del threat model (`docs/daw/security/threat-FEAT-003b.md`), cubierta por
  test explícito (`ConfirmDialog.test.tsx`).
- ✅ F-SAST-04/17: sin `eval()`, `new Function()`.
- ✅ F-SAST-08: no aplica.

## Resto de categorías mandatorias

- ✅ F-SAST-07/09/12: no aplica (sin backend, sin servidor).
- ✅ F-SAST-10: sin `console.log`/`console.debug` en código de producción.
- ✅ F-SAST-11: no aplica.
- ✅ F-SAST-14: `updateMarker`/`removeMarker` validan `id` implícitamente (no-op seguro si no
  existe, documentado y testeado en Block 1); el campo de etiqueta en modo edición mantiene el mismo
  `maxLength={200}` ya validado en FEAT-003a.
- ✅ F-SAST-15: sin catches genéricos que expongan detalles internos.

## Dependencias (F-SAST-13/16)

- `npm audit`: **0 vulnerabilidades** (el fix de `nanoid` aplicado en FEAT-003a ya está presente en
  esta rama, heredado vía `package-lock.json`). No se agregaron dependencias nuevas en este ticket.

## Suppressions

Ninguna.

## Resultado

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│  Secrets:            ✅ F-SAST-01                              │
│  Injection:           ✅ F-SAST-02/03/05 (no aplica)            │
│  XSS / unsafe fns:     ✅ F-SAST-04/06/08/17                    │
│  Resto mandatorias:    ✅ F-SAST-07/09/10/11/12/14/15            │
│  Dependencias:         ✅ F-SAST-13 (0 vulnerabilidades,          │
│                           sin dependencias nuevas)                 │
│  Suppressions: 0                                                 │
│  ────────────────────────────────────────────────────────────│
│  Total: 0 vulnerabilidades abiertas                              │
│  Report: docs/daw/security/sast-FEAT-003b.md                    │
│  Next: cerrar CODE (gates tests+sast) y pasar a VERIFY           │
└─────────────────────────────────────────────────────────────┘
```
