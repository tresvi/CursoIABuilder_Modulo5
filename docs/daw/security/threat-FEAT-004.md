# Threat Model FEAT-004: Herramienta Regla — medir Δt/Δamplitud (RF-08)

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| Spec | docs/daw/specs/spec-FEAT-004.md |
| Date | 2026-08-23 |

## Componentes nuevos/modificados (spec-FEAT-004.md)

1. `viewStore` — `ChartTool` amplía a incluir `'ruler'` (Block 1).
2. `lib/ecg/chart/scale.ts` — `yToMv`, inversa de `mvToY` (Block 1).
3. `components/render/drawOverlay.ts` — `drawRuler`, dibuja línea + tooltip numérico (Block 2).
4. `ChartToolbar` — botón "Regla" (Block 3).
5. `ECGChart` — captura de arrastre, cálculo de Δt/Δamplitud, persistencia visual del overlay
   (Block 4).

## Trust boundaries

Sin cambios respecto a `docs/daw/security/threat-FEAT-003b.md`: sigue siendo una app front-end pura
sin backend nuevo, sin red, sin persistencia. Este ticket **no introduce ninguna frontera de
confianza nueva**: no hay campo de texto libre, no hay input de usuario que se renderice como
contenido — todo lo que `drawRuler` pinta son números calculados a partir de coordenadas de mouse y
de la señal ya cargada (validada en FEAT-001), nunca texto arbitrario del usuario.

## Análisis STRIDE por componente

### 1-5. Todos los componentes del ticket

| Categoría | Análisis |
|---|---|
| Spoofing / Repudiation / Elevation of Privilege | N/A — sin identidad de usuario, sin multi-usuario, mismo criterio que tickets anteriores. |
| Tampering | N/A — sin datos persistidos ni transmitidos; los cálculos de Δt/Δamplitud viven solo en el ciclo de un arrastre de mouse, en memoria de un único render. |
| **Information Disclosure** | El tooltip de `drawRuler` muestra únicamente números derivados de la señal ya cargada (tiempo y amplitud), calculados con `toFixed()` — no hay interpolación de texto de usuario ni riesgo de XSS (a diferencia de `MarkerList`/`ConfirmDialog` en FEAT-003a/b, que sí manejaban una etiqueta de texto libre). Este ticket no reintroduce esa superficie. |
| Denial of Service | El recálculo de `computeYRange(signal.samples)` en cada `mousedown` (no en cada `mousemove`, por diseño — ver `rulerYRangeRef` en la spec) evita un costo O(n) repetido por píxel de arrastre en señales grandes. Sin este cacheo, señales muy largas podrían degradar el frame rate durante el arrastre — ya mitigado en el diseño de Block 4. |

## Riesgos identificados

| Riesgo | STRIDE | Likelihood | Impact | Mitigación |
|---|---|---|---|---|
| Recalcular `computeYRange` en cada `mousemove` degradaría el rendimiento en señales largas | Denial of Service (UX) | Low | Low | Ya mitigado en diseño: `rulerYRangeRef` se calcula una sola vez por `mousedown`, no por cada `mousemove` (spec Block 4). |
| Ninguno relacionado a exposición de datos o inyección: no hay superficie de texto de usuario en este ticket. | — | — | — | No aplica mitigación adicional. |

No hay datos clasificables como PII/credenciales/financieros en este ticket (F-TM-05 N/A): los
únicos valores mostrados son diferencias de tiempo/amplitud de la señal ECG ya cargada y validada en
FEAT-001, sin ningún dato nuevo del usuario. F-TM-07 no aplica.

## Mitigaciones a incorporar en la spec

Ninguna nueva. El único riesgo con impacto real (recomputar `yRange` por evento) ya está resuelto
en el diseño de la spec antes de este análisis formal.
