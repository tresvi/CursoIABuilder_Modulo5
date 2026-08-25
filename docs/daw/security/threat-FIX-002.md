# Threat Model FIX-002: Regla — limpiar overlay + selección rectangular

| Field | Value |
|-------|-------|
| Ticket | FIX-002 |
| Fix-plan | docs/daw/specs/fix-FIX-002.md |
| Date | 2026-08-25 |

## Componente modificado

`src/frontend/src/components/render/drawOverlay.ts` — `drawRuler`: se agrega `clearOverlay(ctx,
dims)` al inicio (mismo patrón que `drawSelection`) y se reemplaza el dibujo de línea diagonal por
un rectángulo (`fillRect`+`strokeRect`) entre `(x0,y0)` y `(x1,y1)`, reusando las constantes
`SELECTION_FILL`/`SELECTION_STROKE` ya existentes.

## Trust boundaries

Sin cambios respecto a los threat models anteriores (FEAT-004, FIX-001): app front-end pura, sin
backend, sin red, sin persistencia. Este fix **no introduce ninguna frontera de confianza nueva**:
las coordenadas `x0,y0,x1,y1` ya se calculaban antes del fix a partir de eventos de mouse sobre la
señal ya cargada y validada (FEAT-001); el fix solo cambia cómo se dibujan (rectángulo en vez de
línea) y cuándo se limpia el canvas antes de dibujar, sin agregar ninguna entrada nueva ni texto de
usuario.

## Análisis STRIDE

| Categoría | Análisis |
|---|---|
| Spoofing / Tampering / Repudiation / Information Disclosure / Elevation of Privilege | N/A — cambio puramente visual sobre el canvas overlay, sin datos de usuario, sin identidad, sin persistencia, sin red. |
| Denial of Service | N/A — agregar un `clearRect` (operación O(1) sobre el canvas) y cambiar de `moveTo/lineTo` a `fillRect/strokeRect` no cambia el orden de complejidad del dibujo; sigue disparándose solo en `onMouseMove` durante el arrastre, mismo mecanismo de overlay ya validado en NFR-01 de FEAT-004 (≥10fps). |

## Riesgos identificados

Ninguno. Superficie idéntica a la ya cubierta por el threat model de FEAT-004 (mismo componente,
mismo mecanismo de overlay); el cambio es de renderizado puro, sin nuevas fuentes de datos ni nuevos
caminos de ejecución.

## Mitigaciones a incorporar en el fix-plan

Ninguna.
