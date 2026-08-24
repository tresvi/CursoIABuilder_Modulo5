# Spec FEAT-006: Métricas cardíacas HRV — BPM, SDNN, RMSSD, pNN50 sobre ventana visible (RF-14)

| Field | Value |
|-------|-------|
| Ticket | FEAT-006 |
| PRD | docs/daw/prd/prd-FEAT-006.md |
| Tier | FEATURE |
| Date | 2026-08-23 |
| Spec loops | 0 |

## Summary

Se agrega un módulo nuevo `lib/ecg/metrics/` con tres funciones puras — `detectRPeaks` (detección de
picos R por umbral adaptativo, sin filtrado DSP previo porque RF-10 no existe todavía),
`computeHrvMetrics` (BPM/SDNN/RMSSD/pNN50 a partir de los picos R, `null` por campo cuando falta
información) y `samplesInWindow` (filtrado puro de muestras a un `TimeWindow`, extraído para no
mezclar lógica de datos dentro del componente, según el audit de arquitectura de PLAN) — y un
componente nuevo `MetricsPanel.tsx` que compone las tres funciones sobre `signalStore`/`viewStore` y
muestra el resultado o "N/A" por métrica. Todo el cálculo es client-side, sin red ni persistencia.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 1 |
| FR-02 | Block 2 |
| FR-03 | Block 4 |
| FR-04 | Block 3, Block 4 |
| FR-05 | Block 2, Block 4 |
| NFR-01 | Strategy: Block 5 mide el tiempo de `samplesInWindow` + `computeHrvMetrics` sobre el archivo de referencia de 1 minuto (mismo criterio p95/20 mediciones que RNF-01/RNF-03 del PRD maestro), y lo deja como test automatizado. |
| NFR-02 | Strategy: `MetricsPanel` es un componente React separado del canvas (`ECGChart`); su `useMemo`/render no toca `drawChart` ni el lienzo base — cero redibujado adicional del gráfico. |

## Dependencies between blocks

Secuencial en su mayoría: Block 1 → Block 2 (consume `detectRPeaks`) → Block 4 (consume
`computeHrvMetrics` de Block 2 y `samplesInWindow` de Block 3). Block 3 es independiente de 1 y 2
(no depende de picos R, solo filtra por tiempo) y puede implementarse en paralelo, pero se numera
después por orden de lectura del panel. Block 5 depende de que 1-4 estén completos (integra y mide
performance sobre el resultado final).

## Block 1 — `lib/ecg/metrics/rpeaks.ts`: `detectRPeaks`

**Files**
- `src/frontend/src/lib/ecg/metrics/rpeaks.ts` (new) — exporta
  `detectRPeaks(samples: ECGSample[]): number[]`.
- `src/frontend/src/lib/ecg/metrics/rpeaks.test.ts` (new).

**Logic**

Pipeline interno (funciones no exportadas dentro del mismo archivo, por legibilidad — sugerencia del
arch-auditor):

1. `derivativeSquare(samples)`: `diff[i] = (mV[i]-mV[i-1]) / (t[i]-t[i-1])` (paso a paso variable,
   nunca se asume muestreo uniforme), luego `diff[i]^2`. `diff[0] = 0` (no hay muestra anterior).
2. `movingIntegration(sq, samples)`: ventana móvil de ~150 ms (convertida a número de muestras según
   el paso promedio local, no un tamaño de ventana fijo en índices) que promedia `sq` para obtener un
   "envelope" con un lóbulo por latido.
3. `adaptiveThreshold(envelope)`: `mean(envelope) + k * std(envelope)`, con `k = 1.2` (constante de
   módulo, ajustable). Calculado sobre el envelope completo recibido (es decir, sobre la ventana
   visible que le pase el caller — Block 4 ya filtra antes de llamar).
4. `findCandidates(envelope, threshold)`: máximos locales del envelope por encima del umbral.
5. Período refractario: descarta candidatos a menos de 250 ms del último candidato aceptado.
6. Refinamiento: para cada candidato aceptado, busca el índice de `mV` máximo dentro de ±75 ms
   alrededor del candidato (ventana de refinamiento, la mitad del refractario) y devuelve `t` de ese
   índice como el pico R real — nunca el índice del envelope suavizado, que está desfasado.

**Guardas de entrada (mitigación de riesgo DoS del threat model FEAT-006)**
- Muestras con `mV`/`t` no finitos (`NaN`/`Infinity`) se excluyen antes del paso 1 (se tratan como si
  no existieran, no se detiene el cálculo).
- `samples.length < 3` (no alcanza para derivada + integración + al menos 1 pico) → devuelve `[]`
  inmediatamente, sin recorrer el resto del pipeline.

**Error handling**
- Nunca lanza excepción: toda entrada degenerada (vacía, 1-2 muestras, todo no-finito) devuelve `[]`.
- No hay entrada externa nueva: `samples` ya viene validado numéricamente por `parseCsv` (FEAT-001).

**Required tests**
- [ ] Sobre una señal sintética con QRS regulares conocidos (generada en el test, ej. picos
      gaussianos angostos cada 800ms), `detectRPeaks` detecta un pico por cada QRS, con error de
      tiempo menor a 20ms respecto al pico sintético real.
- [ ] Dos picos separados menos de 250ms (violan el período refractario) — solo se acepta el primero.
- [ ] `samples` vacío o con 1-2 elementos → devuelve `[]`, no lanza.
- [ ] `samples` con algunas muestras `NaN`/`Infinity` intercaladas → se ignoran, no rompen la
      detección del resto de los picos.
- [ ] Señal plana (sin variación, `mV` constante) → devuelve `[]` (ningún candidato supera el
      umbral adaptativo, que en ese caso es `0` o cercano).

**Completion criterion**
`rpeaks.test.ts` verde; `npm run typecheck` limpio.

## Block 2 — `lib/ecg/metrics/types.ts` + `hrv.ts`: `HrvMetrics` + `computeHrvMetrics`

**Files**
- `src/frontend/src/lib/ecg/metrics/types.ts` (new) — exporta
  `export type HrvMetrics = { bpm: number | null; sdnn: number | null; rmssd: number | null; pnn50: number | null };`
  (mismo patrón de `chart/types.ts`: tipos planos de la capa de lógica, sin dependencias de
  Canvas/DOM).
- `src/frontend/src/lib/ecg/metrics/hrv.ts` (new) — exporta
  `computeHrvMetrics(samples: ECGSample[]): HrvMetrics`.
- `src/frontend/src/lib/ecg/metrics/hrv.test.ts` (new).

**Logic**
1. `const rPeaks = detectRPeaks(samples)`.
2. `intervalsMs = []`: para cada par consecutivo de picos, `(rPeaks[i+1] - rPeaks[i]) * 1000`
   (asumiendo `t` en segundos, consistente con `ECGSample.t`).
3. `bpm`: `rPeaks.length >= 2` → `60000 / mean(intervalsMs)`; si no, `null`.
4. `sdnn`: `intervalsMs.length >= 2` → desviación estándar poblacional de `intervalsMs`; si no,
   `null`.
5. `rmssd`: `rPeaks.length >= 3` (equivalente a `intervalsMs.length >= 2` diffs sucesivos) →
   `sqrt(mean((intervalsMs[i+1]-intervalsMs[i])^2))`; si no, `null`.
6. `pnn50`: mismo requisito que `rmssd` → porcentaje de `|intervalsMs[i+1]-intervalsMs[i]| > 50` sobre
   el total de diffs sucesivos; si no, `null`.

**Error handling**
- Ningún campo lanza excepción por datos insuficientes: cada uno cae a `null` de forma independiente
  (un caso puede tener `bpm` calculable pero `rmssd`/`pnn50` no, si hay exactamente 2 picos).
- Reutiliza las guardas de `detectRPeaks` (Block 1); no duplica validación de entrada no finita.

**Required tests**
- [ ] AC-01: con una señal sintética de RR regulares conocidos (ej. 800ms constante), `bpm` ≈ 75,
      `sdnn` ≈ 0, `rmssd` ≈ 0, `pnn50` = 0.
- [ ] Con RR variables conocidos (ej. alternando 700ms/900ms), `sdnn`/`rmssd`/`pnn50` calculan los
      valores esperados (calculados a mano en el test, no solo "no null").
- [ ] AC-04: exactamente 1 pico R (o 0) → los 4 campos son `null`.
- [ ] AC-04: exactamente 2 picos R → `bpm` calculable, `sdnn` calculable (1 intervalo NN, sdnn de un
      solo dato es 0 por definición — verificar que no divide por cero), `rmssd`/`pnn50` son `null`
      (no hay 2 diffs sucesivos).
- [ ] `samples` vacío → los 4 campos `null`, sin lanzar.

**Completion criterion**
`hrv.test.ts` verde; `npm run typecheck` limpio.

## Block 3 — `lib/ecg/metrics/window.ts`: `samplesInWindow`

**Files**
- `src/frontend/src/lib/ecg/metrics/window.ts` (new) — exporta
  `samplesInWindow(samples: ECGSample[], window: TimeWindow): ECGSample[]`.
- `src/frontend/src/lib/ecg/metrics/window.test.ts` (new).

**Logic**
`samples.filter((s) => s.t >= window.fromTime && s.t <= window.toTime)` — mismo predicado de límites
inclusivos que `cropSignal` (`lib/ecg/crop.ts`), pero **sin** el criterio de `null` bajo 2 muestras:
esta función siempre devuelve el array filtrado tal cual (incluso vacío o de 1 elemento), porque
`computeHrvMetrics` (Block 2) ya sabe manejar esos casos devolviendo `null` por campo — extraída
como función independiente en vez de reusar `cropSignal` exactamente por esta diferencia de
contrato (documentado en el impact scan y el audit de arquitectura de PLAN).

**Error handling**
- Ninguna condición de error: función pura total, cualquier `samples`/`window` (incluso vacíos)
  produce un array (potencialmente vacío), nunca lanza.

**Required tests**
- [ ] Devuelve solo las muestras dentro de `[fromTime, toTime]`, límites inclusivos (una muestra
      exactamente en `fromTime` y otra exactamente en `toTime` se incluyen ambas).
- [ ] `samples` vacío → devuelve `[]`.
- [ ] `window` que no intersecta ninguna muestra → devuelve `[]`.
- [ ] No muta el array `samples` original (verificar con referencia/longitud original intacta).

**Completion criterion**
`window.test.ts` verde; `npm run typecheck` limpio.

## Block 4 — `components/MetricsPanel.tsx`: panel de métricas

**Files**
- `src/frontend/src/components/MetricsPanel.tsx` (new).
- `src/frontend/src/components/MetricsPanel.test.tsx` (new).

**Logic**
- Selectores por campo (mismo patrón que `ChartToolbar`/`MarkerList`):
  `const signal = useSignalStore((s) => s.signal);` y
  `const visibleWindow = useViewStore((s) => s.visibleWindow);`.
- `const metrics = useMemo(() => { if (!signal || !visibleWindow) return null; const windowed =
  samplesInWindow(signal.samples, visibleWindow); return computeHrvMetrics(windowed); }, [signal,
  visibleWindow]);` — el `useMemo` solo recalcula cuando cambia la referencia de `signal` (nueva
  carga/recorte) o de `visibleWindow` (zoom/reset), nunca en cada render (FR-04, NFR-02).
- Si `metrics` es `null` (sin señal cargada, AC-05): el componente no renderiza el panel (o renderiza
  un placeholder vacío, igual criterio que `ECGChart` cuando `!signal`).
- Si `metrics` no es `null`: renderiza 4 celdas/filas — BPM, SDNN, RMSSD, pNN50 — cada una mostrando
  `metrics.<campo>.toFixed(n)` con su unidad (BPM sin decimales, SDNN/RMSSD en ms con 1 decimal,
  pNN50 en % con 1 decimal) si no es `null`, o el texto `"N/A"` si el campo es `null` (AC-04).
- Envuelto en un elemento semántico (`<section aria-label="Métricas cardíacas">`), paleta
  Tailwind slate/sky consistente con `ChartToolbar`/`MarkerList`.

**Error handling**
- Ningún estado de error propio: toda la lógica de "no calculable" ya vive en `computeHrvMetrics`
  (Block 2) como `null` por campo, no como excepción. El componente solo traduce `null` → `"N/A"`.

**Required tests**
- [ ] AC-02/AC-03: con una señal cargada y `visibleWindow` fijo, el panel muestra los 4 valores
      calculados (mock o señal sintética simple, verificar el texto renderizado).
- [ ] AC-03: cambiar `visibleWindow` (simulando un zoom) actualiza los valores mostrados a los
      recalculados sobre la nueva ventana.
- [ ] AC-04: con una ventana visible sin suficientes picos R, las métricas no calculables muestran
      `"N/A"` en vez de un valor o un error.
- [ ] AC-05: sin señal cargada (`signal === null`), el panel no muestra valores de métricas (no
      renderiza el contenido con datos, o renderiza vacío según el criterio adoptado).
- [ ] El `useMemo` no se recalcula si ni `signal` ni `visibleWindow` cambiaron entre renders
      (spy sobre `computeHrvMetrics`, verificar cantidad de invocaciones).

**Completion criterion**
`MetricsPanel.test.tsx` verde; `npm run typecheck` limpio.

## Block 5 — Integración en `App.tsx` + verificación de performance (NFR-01)

**Files**
- `src/frontend/src/App.tsx` (modified) — agrega `<MetricsPanel />` al `flex flex-col gap-6` junto a
  los componentes existentes, después de `<ECGChart />` (el panel de métricas complementa la lectura
  del gráfico, antes de la lista de marcadores).
- `src/frontend/src/lib/ecg/metrics/hrv.test.ts` (modified) — se agrega un test de performance:
  genera una señal sintética equivalente a 1 minuto de ECG (mismo criterio de "archivo de
  referencia" que RNF-01/RNF-03 del PRD maestro — misma frecuencia de muestreo usada en los tests
  de performance de FEAT-002, si existen; si no hay un generador común, se crea uno local en este
  test), ejecuta `samplesInWindow` + `computeHrvMetrics` 20 veces y verifica que el percentil 95 del
  tiempo total sea menor a 0.1s.

**Logic**
Sin lógica nueva de dominio: es cableado de UI (una línea de JSX) más un test de performance sobre
funciones ya implementadas en los blocks anteriores.

**Error handling**
No aplica — este block no introduce código con condiciones de error propias.

**Required tests**
- [ ] NFR-01: percentil 95 sobre 20 mediciones de `samplesInWindow` + `computeHrvMetrics` sobre el
      archivo de referencia de 1 minuto es menor a 0.1s.
- [ ] Regresión: `App.test.tsx` (si existe) o un test manual/smoke confirma que `<MetricsPanel />` se
      renderiza sin romper el árbol existente (`CsvUpload`, `ChartToolbar`, `ECGChart`, `MarkerList`,
      `MarkerForm` siguen presentes).

**Completion criterion**
Suite completa (`npm run test`) verde; `npm run typecheck` y `npm run lint` limpios; el test de
performance de NFR-01 pasa.

## Final verification

- `npm run typecheck`, `npm run lint`, `npm run test` (suite completa) en verde.
- AC-01 a AC-05 del PRD FEAT-006 verificados por al menos un test automatizado cada uno.
- NFR-01 verificado por el test de performance de Block 5; NFR-02 verificado por diseño (Block 4 no
  toca el canvas del gráfico).
- Ningún test de FEAT-001/002/003a/003b/004/005 queda roto (regresión cero).
- Mitigaciones del threat model (`docs/daw/security/threat-FEAT-006.md`) cubiertas: guardas contra
  entradas no finitas/degeneradas en Block 1, "N/A" por métrica no calculable en Block 2/4.
