# Threat Model FIX-001: Cursores custom para Regla y Recorte

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Fix-plan | docs/daw/specs/fix-FIX-001.md |
| Date | 2026-08-24 |

## Componente modificado

`src/frontend/src/components/ECGChart.tsx` — se extiende la expresión `cn(...)` del `className` del
contenedor del gráfico (línea 273-276) para aplicar `cursor-crosshair` también cuando
`activeTool === 'ruler'` o `activeTool === 'crop'` (hoy solo aplica `cursor-zoom-in` para `'zoom'`).

## Trust boundaries

Sin cambios respecto a los threat models anteriores (FEAT-004, FEAT-005, FEAT-006): app front-end
pura, sin backend nuevo, sin red, sin persistencia. Este fix **no introduce ninguna frontera de
confianza nueva**: la clase Tailwind aplicada es un literal de string fijo en el código fuente
(`'cursor-crosshair'`), nunca derivado de input del usuario ni de la señal cargada — no hay ninguna
superficie de inyección posible (no hay interpolación de ningún valor externo en el `className`).

## Análisis STRIDE

| Categoría | Análisis |
|---|---|
| Spoofing / Tampering / Repudiation / Information Disclosure / Elevation of Privilege | N/A — cambio puramente visual/cosmético (una clase CSS condicional sobre un enum interno ya validado por TypeScript), sin datos de usuario, sin identidad, sin persistencia, sin red. |
| Denial of Service | N/A — no agrega cómputo, no cambia ningún bucle de render existente; es una condición adicional en una expresión `cn(...)` ya evaluada en cada render. |

## Riesgos identificados

Ninguno. No hay superficie nueva de ningún tipo: es una extensión de una expresión condicional
existente sobre un `enum` (`ChartTool`) ya cerrado y validado por TypeScript, sin input externo ni
nuevo estado.

## Mitigaciones a incorporar en el fix-plan

Ninguna.
