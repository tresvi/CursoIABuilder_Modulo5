# Verify FIX-002: Regla — limpiar overlay en cada arrastre + selección rectangular

| Field | Value |
|-------|-------|
| Ticket | FIX-002 |
| Fix-plan | docs/daw/specs/fix-FIX-002.md |
| Date | 2026-08-25 |
| Ronda | 1 |

## Fix-plan steps

- ✅ `clearOverlay(ctx, dims)` agregado como primera línea de `drawRuler` (`drawOverlay.ts:59`).
- ✅ Línea diagonal reemplazada por rectángulo (`drawOverlay.ts:61-71`): `fillRect`/`strokeRect` con
  `SELECTION_FILL`/`SELECTION_STROKE`, bounds `loX=min(x0,x1), loY=min(y0,y1), width=abs(x1-x0),
  height=abs(y1-y0)`.
- ✅ Tooltip Δt/ΔmV sin cambios (`drawOverlay.ts:73-85`).
- ✅ `ECGChart.tsx` sin cambios (firma de `drawRuler` intacta, confirmado por diff).

## Regression tests

- ✅ "limpia el overlay antes de dibujar... (FIX-002)" — verifica orden de llamadas (`clearRect`
  antes de `fillRect`/`strokeRect`). Confirmado lógicamente contra el commit pre-fix (986f695^):
  `drawRuler` nunca llamaba `clearRect`, así que este test habría fallado antes.
- ✅ "dibuja un rectángulo entre los dos puntos dados" + "normaliza el rectángulo..." — verifican
  bounds correctos en ambos sentidos de arrastre.
- ✅ Regresión: tests de color/trazo y de tooltip sin cambios, siguen pasando.

## Ejecución

- `npx vitest run drawOverlay`: 6/6 tests.
- Suite completa (2 corridas): 189/189 tests, 22/22 archivos, sin flakes.
- `npm run lint` / `npm run typecheck`: limpios.

## PRD vs. implementación

Confirmado: `prd-FEAT-004.md` (PRD loop 2, FR-02/FR-03/AC-02/AC-03: "rectángulo + tooltip", "sin
acumular dibujos previos") coincide exactamente con la fórmula de bounds implementada.

## Rollback plan

Confirmado: cambio contenido en un solo commit (986f695), sin migración de datos ni estado
persistente afectado.

## Resultado

```
┌─────────────────────────────────────────────────────────┐
│  /daw-verify-module FIX-002 — PASSED                       │
├─────────────────────────────────────────────────────────┤
│  Fix-plan steps: ✅ 1/1                                     │
│  Regression tests: ✅ 3/3 nuevos + 3/3 sin cambios            │
│  Suite completa: ✅ 189/189 (2 corridas)                       │
│  Lint/typecheck: ✅ limpio                                     │
│  PRD ↔ código: ✅ consistente                                    │
│  Rollback plan: ✅ vigente                                        │
│  ────────────────────────────────────────────────────────────  │
│  Total: 10 passed, 0 failed, 0 warnings                          │
│  Result: PASSED                                                  │
│  Next: gates.verify = true → RELEASE                              │
└─────────────────────────────────────────────────────────┘
```
