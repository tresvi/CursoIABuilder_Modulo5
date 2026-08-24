# SAST FEAT-006: Métricas cardíacas HRV — BPM, SDNN, RMSSD, pNN50 sobre ventana visible (RF-14)

| Field | Value |
|-------|-------|
| Ticket | FEAT-006 |
| Date | 2026-08-23 |
| Scope | Archivos nuevos/modificados de los 5 bloques |

## Archivos analizados

- `src/frontend/src/lib/ecg/metrics/rpeaks.ts` (+ test)
- `src/frontend/src/lib/ecg/metrics/hrv.ts` (+ test)
- `src/frontend/src/lib/ecg/metrics/types.ts`
- `src/frontend/src/lib/ecg/metrics/window.ts` (+ test)
- `src/frontend/src/components/MetricsPanel.tsx` (+ test)
- `src/frontend/src/App.tsx` (modificado)

## Secretos

✅ **F-SAST-01**: sin patrones de API key/password/token/connection string en los archivos
analizados (grep sobre todos los archivos nuevos/modificados). `.env` ya está en `.gitignore` desde
tickets anteriores, sin cambios en este ticket.

## Injection

✅ **F-SAST-02/03/05**: no aplica — sin queries a base de datos, sin `exec`/`spawn`/`child_process`,
sin manejo de paths de archivo en ninguno de los archivos de este ticket. Todo el código es cálculo
numérico puro sobre datos ya validados por `parseCsv` (FEAT-001).

## XSS y funciones inseguras

✅ **F-SAST-06**: sin `innerHTML`/`dangerouslySetInnerHTML` en `MetricsPanel.tsx` — los valores se
renderizan como texto JSX (React escapa automáticamente), nunca HTML crudo. No hay texto de usuario
involucrado (los valores mostrados son números calculados, no input libre).
✅ **F-SAST-04**: sin `eval()`, sin deserialización insegura.
✅ **F-SAST-08**: no aplica — sin uso de criptografía en este ticket.

## Resto de categorías obligatorias

✅ **F-SAST-07** (SSRF): no aplica — sin llamadas de red nuevas.
✅ **F-SAST-09** (debug mode): sin flags de debug nuevos.
✅ **F-SAST-10** (logging de datos sensibles): sin `console.log` fuera de comentarios/tests; los
tests de performance usan `console.log` solo para dejar evidencia del tiempo medido (mismo patrón
ya aceptado en `chart.test.ts`/`parseCsv.test.ts`), no hay datos de usuario en esos logs.
✅ **F-SAST-11** (upload sin restricciones): no aplica.
✅ **F-SAST-12** (CSRF): no aplica — sin formularios ni mutaciones de estado del servidor.
✅ **F-SAST-14** (validación de input incompleta): las guardas de entrada de `detectRPeaks`
(muestras no finitas, arrays degenerados) están cubiertas por tests dedicados — ver
`docs/daw/security/threat-FEAT-006.md`.
✅ **F-SAST-15** (manejo de errores que filtra internals): ninguna de las funciones nuevas lanza
excepciones ni expone stack traces; toda condición degenerada devuelve `[]`/`null` por campo.

## Dependencias

✅ **F-SAST-13/16**: `npm audit` (root y `--omit=dev`) → 0 vulnerabilidades. Este ticket no agrega
ninguna dependencia nueva a `package.json` (confirmado: sin diff en `package.json`/
`package-lock.json` contra `main`).

## Suppressions

Ninguna — no hay hallazgos Medium/Low que requieran documentación de supresión.

## Resultado

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│  Secrets: ✅ 0 hallazgos                                       │
│  Injection: ✅ no aplica (sin superficie nueva)                 │
│  XSS/unsafe: ✅ 0 hallazgos                                     │
│  Dependencies: ✅ npm audit — 0 vulnerabilidades                 │
│  Suppressions: 0                                                │
│  ────────────────────────────────────────────────────────────  │
│  Total: 6 archivos limpios, 0 vulnerabilidades (0 crit, 0 high) │
│  Next: gates.sast = true                                        │
└─────────────────────────────────────────────────────────────┘
```
