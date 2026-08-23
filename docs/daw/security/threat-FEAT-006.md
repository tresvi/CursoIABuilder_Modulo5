# Threat Model FEAT-006: Métricas cardíacas HRV — BPM, SDNN, RMSSD, pNN50 sobre ventana visible (RF-14)

| Field | Value |
|-------|-------|
| Ticket | FEAT-006 |
| Spec | docs/daw/specs/spec-FEAT-006.md |
| Date | 2026-08-23 |

## Componentes nuevos/modificados (diseño acordado en PLAN)

1. `lib/ecg/metrics/rpeaks.ts` — `detectRPeaks(samples)`: detección de picos R (derivada → cuadrado
   → integración por ventana móvil → umbral adaptativo → período refractario → refinamiento).
2. `lib/ecg/metrics/types.ts` — tipo `HrvMetrics`.
3. `lib/ecg/metrics/hrv.ts` — `computeHrvMetrics(samples)`: BPM/SDNN/RMSSD/pNN50 a partir de
   `detectRPeaks`.
4. `lib/ecg/metrics/window.ts` — `samplesInWindow(samples, window)`: filtrado puro a la ventana
   visible (extraído del diseño original tras el audit de arquitectura).
5. `components/MetricsPanel.tsx` — UI: compone `samplesInWindow` + `computeHrvMetrics` sobre
   `signalStore`/`viewStore`, muestra valores o "N/A".
6. `App.tsx` — agrega `<MetricsPanel />`.

## Trust boundaries

Sin cambios respecto a `docs/daw/security/threat-FEAT-005.md`: sigue siendo una app front-end pura,
sin backend nuevo, sin red, sin persistencia. Este ticket **no introduce ninguna frontera de
confianza nueva**: no hay input de usuario nuevo — todos los datos de entrada (`signal.samples`) ya
fueron validados como numéricos en FEAT-001 (`parseCsv` rechaza celdas no numéricas, multicanal y
archivos vacíos antes de que la señal llegue a `signalStore`). `detectRPeaks`/`computeHrvMetrics`
son funciones puras sin I/O: no leen archivos, no hacen fetch, no escriben a `localStorage` ni a
ningún backend. El único dato que cruza de `lib/` a la UI son números (BPM/SDNN/RMSSD/pNN50 o
`null`), nunca texto libre de usuario — no hay superficie de inyección de contenido (a diferencia de
`MarkerList`/`ConfirmDialog`, que sí manejan una etiqueta de texto libre).

## Análisis STRIDE por componente

### 1-4. `rpeaks.ts`, `hrv.ts`, `window.ts` (funciones puras de `lib/ecg/metrics/`)

| Categoría | Análisis |
|---|---|
| Spoofing / Repudiation / Elevation of Privilege | N/A — sin identidad de usuario, sin multi-usuario, mismo criterio que tickets anteriores. |
| Tampering | N/A — no hay datos persistidos ni transmitidos; el cálculo vive solo en memoria de un render, recompuesto en cada cambio de `visibleWindow`. |
| Information Disclosure | N/A — no se expone ningún dato nuevo: BPM/HRV son una transformación numérica de la misma señal ya visible en el gráfico (FEAT-002), no un dato adicional del usuario. |
| **Denial of Service** | Una señal con muestreo irregular, valores no finitos residuales, o una ventana visible muy grande (archivo largo con zoom "restablecido") podría hacer que `detectRPeaks`/`computeHrvMetrics` tarden más de lo esperado o entren en un bucle/recorrido patológico si no se manejan los casos borde (arrays vacíos, 1 muestra, `NaN`/`Infinity` residual). Mitigación: `rpeaks.ts` debe descartar/ignorar explícitamente muestras no finitas y tratar arrays de 0/1 elemento como "sin picos" (no como error), con tests que cubran esos casos; el cálculo se dispara solo al cambiar `visibleWindow` (una vez por gesto, confirmado en el impact scan de PLAN), nunca en cada frame de arrastre. |

### 5. `MetricsPanel.tsx`

| Categoría | Análisis |
|---|---|
| Spoofing / Tampering / Repudiation / Elevation of Privilege | N/A — componente de solo lectura, sin input de usuario. |
| Information Disclosure | N/A — mismos valores que ya están implícitos en el gráfico visible; no hay export ni envío a ningún destino. |
| Denial of Service | Riesgo de re-render en bucle si el `useMemo` no está bien memoizado en `[signal, visibleWindow]` (bug de performance, no de seguridad) — mitigado por diseño explícito de las dependencias del memo. |

## Riesgos identificados

| Riesgo | STRIDE | Likelihood | Impact | Mitigación |
|---|---|---|---|---|
| Detección de picos R poco fiable sobre señal ruidosa sin filtrado previo (RF-10 no implementado) → BPM/HRV erróneos mostrados al usuario | Information Disclosure (dato incorrecto, no fuga) | Medium | Low | **Riesgo aceptado** (ya documentado en el PRD FEAT-006, sección Riesgos): mitigado parcialmente con umbral adaptativo + período refractario; aceptado por el usuario del producto, con condición de revisión cuando se implemente RF-10. No es un riesgo de seguridad de la aplicación — es una limitación de exactitud del dominio, documentada para que el usuario final no interprete el valor como diagnóstico clínico (consistente con AGENTS.md: la app no es una herramienta de diagnóstico certificado). |
| Entrada con valores no finitos (`NaN`/`Infinity`) o arrays degenerados (0/1 muestra) llega a `detectRPeaks` sin manejo explícito | Denial of Service (excepción no controlada / cálculo colgado) | Low | Low | Guardas explícitas al inicio de `detectRPeaks`/`computeHrvMetrics`: descartar muestras no finitas, devolver `[]`/campos `null` para arrays con menos del mínimo requerido, sin lanzar excepción. Cubierto con tests unitarios de caso borde (AC-04 del PRD ya exige este comportamiento para el usuario final). |

No hay datos clasificables como PII/credenciales/financieros en este ticket (F-TM-05): los valores
mostrados (BPM/SDNN/RMSSD/pNN50) son una transformación de la señal ECG ya cargada y validada en
FEAT-001, sin ningún dato nuevo del usuario, sin persistencia (RF-15 fuera de alcance) y sin envío a
ningún servicio externo. F-TM-07 no aplica.

## Mitigaciones a incorporar en la spec

1. `detectRPeaks`/`computeHrvMetrics` deben tratar explícitamente muestras no finitas y arrays
   degenerados (0/1 elemento) como "sin picos"/"no calculable", nunca lanzar una excepción — con
   tests dedicados a estos casos borde.
2. El riesgo de exactitud sin filtrado previo (RF-10) ya está aceptado y documentado en el PRD; la
   spec debe mantener el requisito de mostrar "N/A" por métrica cuando no hay suficientes picos
   (AC-04/AC-05 del PRD), en vez de mostrar un valor calculado sobre datos insuficientes.
