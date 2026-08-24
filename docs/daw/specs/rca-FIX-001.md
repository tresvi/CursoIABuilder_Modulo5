# RCA FIX-001: Cursores custom para Regla (regla) y Recorte (tijera)

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Date | 2026-08-24 |

## Síntoma

El PRD maestro (`docs/daw/prd/PRD.md`) exige, para las herramientas Zoom, Regla y Recorte, que "el
cursor toma forma de X" mientras esa herramienta está activa (AC-08 lupa, AC-11 regla, AC-12
tijera). Solo Zoom lo tiene implementado (`ECGChart.tsx`, clase Tailwind `cursor-zoom-in`, aplicada
solo cuando `activeTool === 'zoom'`). Regla y Recorte no cambian el cursor en absoluto — el usuario
ve el cursor por defecto del navegador mientras arrastra con esas herramientas activas.

## Causa raíz

Al escribir `prd-FEAT-004.md` (Regla) y `prd-FEAT-005.md` (Recorte) durante la fase DEFINE de esos
tickets, el requisito del PRD maestro "el cursor toma forma de X" (cambio visual del puntero) se
reinterpretó como "la posición actual del cursor" (seguimiento de la coordenada del mouse para
calcular Δt/Δamplitud, o para definir el rango de recorte). Son dos conceptos distintos que
comparten la misma palabra en español — "cursor" como ícono visual del puntero vs. "cursor" como
posición/coordenada — y esa ambigüedad hizo que el requisito visual del PRD maestro se perdiera
silenciosamente al redactar el PRD de cada ticket: cada `prd-FEAT-00X.md` quedó autoconsistente
(sus propios FR/AC no se contradicen entre sí), pero incompleto respecto al PRD maestro que
originó el ticket.

Como `daw-verify-module` (fase VERIFY) valida cada ticket contra **su propio PRD**, no contra el
maestro, el gate nunca detectó la omisión: no había ningún AC-11/AC-12 local con el que
contrastar el código, así que "no implementar el cursor" no rompió ningún test ni ninguna
verificación. El defecto solo se hizo visible al auditar manualmente el código contra el PRD
maestro completo (fuera del flujo normal de la pipeline), después de cerrar FEAT-006.

## Affected component

- `src/frontend/src/components/ECGChart.tsx`: el `className` del contenedor del gráfico
  (línea 273-276) solo aplica `cursor-zoom-in` cuando `activeTool === 'zoom'`; no hay ninguna clase
  de cursor condicional para `activeTool === 'ruler'` ni `activeTool === 'crop'`.

## Related PRD

- `docs/daw/prd/PRD.md` (maestro): ya contenía el requisito correcto desde el inicio (AC-08, AC-11,
  AC-12) — no tiene ningún gap.
- `docs/daw/prd/prd-FEAT-004.md` y `docs/daw/prd/prd-FEAT-005.md`: tenían el gap (ver arriba).
  **Ya corregido** en este mismo ticket: se agregó FR-06/AC-07 a `prd-FEAT-004.md` (PRD loop 1) y
  FR-07/AC-08 a `prd-FEAT-005.md` (PRD loop 2), ambos re-validados con `daw-validate-prd` → PASSED.

## Gap in the PRD

Sí — ya resuelto (ver sección anterior). El usuario aprobó ambas actualizaciones antes de continuar
con el fix-plan.

## Confirmación

Análisis confirmado por el usuario el 2026-08-24.
