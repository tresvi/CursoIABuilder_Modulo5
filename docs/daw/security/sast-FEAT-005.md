# SAST FEAT-005: Herramienta Recorte (RF-09)

| Field | Value |
|-------|-------|
| Ticket | FEAT-005 |
| Date | 2026-08-23 |

## Alcance

Archivos tocados por CODE (Blocks 1-5):
- `src/frontend/src/lib/ecg/crop.ts` (nuevo)
- `src/frontend/src/lib/ecg/crop.test.ts` (nuevo)
- `src/frontend/src/state/signalStore.ts` (modificado)
- `src/frontend/src/state/signalStore.test.ts` (nuevo)
- `src/frontend/src/state/markersStore.ts` (modificado)
- `src/frontend/src/state/markersStore.test.ts` (modificado)
- `src/frontend/src/state/viewStore.ts` (modificado)
- `src/frontend/src/state/viewStore.test.ts` (modificado)
- `src/frontend/src/components/ChartToolbar.tsx` (modificado)
- `src/frontend/src/components/ChartToolbar.test.tsx` (modificado)
- `src/frontend/src/components/ECGChart.tsx` (modificado)
- `src/frontend/src/components/ECGChart.test.tsx` (modificado)

## Resultados

**Secrets (F-SAST-01):** ✅ `git diff` sobre todos los archivos tocados, sin patrones de API
key/password/secret/token/bearer. `.env` ya está en `.gitignore` (sin cambios en este ticket).

**Injection (F-SAST-02/03/05):** ✅ N/A — este ticket es 100% cliente, sin queries SQL, sin
`exec`/`spawn`, sin paths de filesystem construidos con input de usuario. `cropSignal` (Block 1)
solo compara `number`s (`t >= range.fromTime && t <= range.toTime`).

**XSS (F-SAST-06):** ✅ Sin `dangerouslySetInnerHTML`, sin `eval()`, sin `.innerHTML` en ningún
archivo tocado. El texto del `ConfirmDialog` (`ECGChart.tsx`) interpola `formatMarkerTime(...)` —
un `number` formateado por una función pura, nunca texto libre del usuario — vía interpolación JSX
estándar (mismo patrón ya establecido en FEAT-003b para `ConfirmDialog`).

**Funciones inseguras / crypto débil (F-SAST-04/08):** ✅ N/A — sin `eval`, sin criptografía en
este ticket.

**SSRF / debug mode / logging sensible / upload / CSRF (F-SAST-07/09/10/11/12):** ✅ N/A — sin
llamadas de red nuevas, sin `console.log` (verificado), sin upload de archivos, sin formularios que
requieran CSRF (app sin sesiones, per AGENTS.md).

**Validación de input incompleta (F-SAST-14):** ✅ El único input externo (arrastre de mouse) ya
está validado por `pixelRangeToWindow`/`MIN_DRAG_PX` (reusado de FEAT-002, sin cambios), que
garantiza `fromTime < toTime` antes de que cualquier código de este ticket lo reciba. `cropSignal`
maneja explícitamente el caso degenerado (`<2` muestras → `null`).

**Manejo de errores que filtra internals (F-SAST-15):** ✅ N/A — no hay excepciones que se
propaguen a UI; todos los casos de borde son no-ops silenciosos documentados en la spec (Block
1-3), sin stack traces ni mensajes de error expuestos.

**Dependencias (F-SAST-13/16):** ✅ `npm audit --omit=dev` → 0 vulnerabilidades. Sin dependencias
nuevas agregadas en este ticket.

## Suppressions

Ninguna — no hubo hallazgos Medium/Low que requirieran documentar una supresión.

## Resultado

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│  Secrets: ✅ F-SAST-01                                        │
│  Injection: ✅ F-SAST-02/03/05 (N/A, sin superficie)           │
│  XSS/unsafe: ✅ F-SAST-04/06/08                                │
│  Otros: ✅ F-SAST-07/09/10/11/12/14/15                          │
│  Dependencies: ✅ F-SAST-13/16 — npm audit 0 vulnerabilidades  │
│  Suppressions: 0                                                │
│                                                                │
│  Total: 12 archivos limpios, 0 vulnerabilidades (0 crit,        │
│    0 high, 0 medium)                                            │
│  Report: docs/daw/security/sast-FEAT-005.md                     │
└─────────────────────────────────────────────────────────────┘
```
