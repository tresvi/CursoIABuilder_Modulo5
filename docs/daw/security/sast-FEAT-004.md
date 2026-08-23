# SAST FEAT-004: Herramienta Regla — medir Δt/Δamplitud (RF-08)

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| Date | 2026-08-23 |

## Alcance

Archivos nuevos/modificados en `src/frontend/src` (Blocks 1-4 de `spec-FEAT-004.md`):
`viewStore.ts`, `lib/ecg/chart/scale.ts`, `components/render/drawOverlay.ts` (+ `.test.ts` nuevo),
`ChartToolbar.tsx`, `ECGChart.tsx`. Sin dependencias nuevas en este ticket (reusa
`@radix-ui/react-dialog` heredado de FEAT-003a, ni siquiera lo toca directamente). Adicionalmente se
corrió `npm run format`, que reformateó cosméticamente algunos archivos preexistentes fuera de este
ticket (comillas/ancho de línea) sin cambiar comportamiento — no forman parte de la superficie
evaluada por SAST más allá de confirmar que no introducen nada nuevo.

## Secrets

- ✅ F-SAST-01: sin patrones de API key/password/token hardcodeados (grep sin resultados).
- ✅ `.env` sigue en `.gitignore` (sin cambios respecto a tickets anteriores).

## Injection

- ✅ F-SAST-02/03/05: no aplica — sin queries, sin backend, sin filesystem tocado.

## XSS y funciones inseguras

- ✅ F-SAST-06: sin `dangerouslySetInnerHTML` ni `.innerHTML =` en ningún archivo del alcance. `
  drawRuler` pinta únicamente números calculados (`Δt`/`ΔmV`, derivados de coordenadas de mouse y de
  la señal ya validada en FEAT-001) vía `ctx.fillText` — no hay texto de usuario involucrado en
  ningún punto de este ticket (a diferencia de FEAT-003a/b, que sí manejaban etiquetas libres).
- ✅ F-SAST-04/17: sin `eval()`, `new Function()`.
- ✅ F-SAST-08: no aplica.

## Resto de categorías mandatorias

- ✅ F-SAST-07/09/12: no aplica (sin backend, sin servidor).
- ✅ F-SAST-10: sin `console.log`/`console.debug` en código de producción.
- ✅ F-SAST-11: no aplica.
- ✅ F-SAST-14: no hay input de usuario nuevo (solo coordenadas de mouse, ya clampeadas por
  `xToTime`/`yToMv`, documentado y testeado en Block 1).
- ✅ F-SAST-15: sin catches genéricos que expongan detalles internos.

## Dependencias (F-SAST-13/16)

- `npm audit`: **0 vulnerabilidades**. Sin dependencias nuevas en este ticket.

## Suppressions

Ninguna.

## Resultado

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│  Secrets:            ✅ F-SAST-01                              │
│  Injection:           ✅ F-SAST-02/03/05 (no aplica)            │
│  XSS / unsafe fns:     ✅ F-SAST-04/06/08/17 — sin superficie   │
│                           de texto de usuario en este ticket    │
│  Resto mandatorias:    ✅ F-SAST-07/09/10/11/12/14/15            │
│  Dependencias:         ✅ F-SAST-13 (0 vulnerabilidades,          │
│                           sin dependencias nuevas)                 │
│  Suppressions: 0                                                 │
│  ────────────────────────────────────────────────────────────│
│  Total: 0 vulnerabilidades abiertas                              │
│  Report: docs/daw/security/sast-FEAT-004.md                     │
│  Next: cerrar CODE (gates tests+sast) y pasar a VERIFY           │
└─────────────────────────────────────────────────────────────┘
```
