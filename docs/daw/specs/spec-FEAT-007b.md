# Spec FEAT-007b: Filtros DSP

| Field | Value |
|-------|-------|
| Ticket | FEAT-007b |
| PRD | docs/daw/prd/prd-FEAT-007b.md |
| Tier | FEATURE |
| Date | 2026-08-26 |
| Spec loops | 0 |

## Summary

Se agrega `POST /api/filters/apply` a `ECGViewer.Api`, con todo el código nuevo en
`src/backend/ECGViewer.Api/Filters/`: DTOs, validaciones (Nyquist, low<high, ventana positiva,
grado<ventana, ventana≤total de muestras, límite de 500.000 muestras) y los 7 filtros (4 espectrales
vía `FftSharp.Filter`, 3 de dominio temporal implementados a mano). En el front, un cliente HTTP
(`lib/api/filters.ts`), una función compartida de frecuencia de muestreo (`lib/ecg/sampleRate.ts`),
extensiones a `signalStore` (aplicar encadenado + revertir un nivel, sin llamada al backend para
revertir) y el componente `FilterPanel` montado entre `ChartToolbar` y `ECGChart`. Las tres
mitigaciones del threat model (`docs/daw/security/threat-FEAT-007b.md`) quedan incorporadas en los
Bloques 1 y 3.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 7 |
| FR-02 | Block 7 |
| FR-03 | Block 7 |
| FR-04 | Block 7 |
| FR-05 | Block 7 |
| FR-06 | Block 2, Block 3, Block 5, Block 6, Block 7 |
| FR-07 | Block 6, Block 7 |
| FR-08 | Block 6, Block 7 |
| FR-09 | Block 6 |
| FR-10 | Block 1, Block 7 |
| FR-11 | Block 1, Block 7 |
| FR-12 | Block 1, Block 7 |
| FR-13 | Block 1, Block 7 |
| FR-14 | Block 2, Block 3 |
| NFR-01 | Strategy: filtros procesados en memoria sobre arrays nativos (`double[]`), sin I/O adicional; medido en los tests de integración del Bloque 4 (assert de latencia sobre una señal de 1 minuto). |
| NFR-02 | Strategy: Block 4 valida explícitamente que el payload no represente una señal multicanal (mismo criterio que el parser de CSV: más de 2 columnas equivalentes), rechazando con 400 antes de procesar cualquier filtro. |
| NFR-03 | Strategy: `signalStore` (Block 6) no persiste `previousSignal` ni el resultado del filtro en SQLite ni en `localStorage` — vive únicamente en memoria de sesión, igual que `signal` hoy. |

## Dependencies between blocks

Block 1 → Block 2, Block 3 (ambos usan las validaciones y DTOs del Bloque 1).
Block 2, Block 3 → Block 4 (el barrido final de tests necesita el endpoint completo con los 7 tipos).
Block 1 → Block 5 (el cliente HTTP del front espera el contrato de request/response ya definido).
Block 5 → Block 6 (`signalStore` usa el cliente HTTP).
Block 6 → Block 7 (`FilterPanel` usa las acciones de `signalStore`).
Block 7 → Block 8 (montaje en `App.tsx`).
Orden de ejecución: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. (2 y 3 pueden implementarse en cualquier orden
entre sí, pero se numeran secuencialmente para mantener un commit por bloque.)

## Block 1 — DTOs y validaciones (`Filters/`)

**Files**
- `src/backend/ECGViewer.Api/Filters/FilterModels.cs` (new) — `FilterType` enum (7 valores:
  `LowPass`, `HighPass`, `BandPass`, `Notch`, `MovingAverage`, `MovingMedian`, `SavitzkyGolay`),
  `FilterRequest` (record: `Samples: List<SampleDto>`, `FilterType: FilterType`,
  `Cutoff?: double`, `CutoffLow?: double`, `CutoffHigh?: double`, `Window?: int`,
  `PolynomialDegree?: int`), `SampleDto` (record: `T: double`, `MV: double`), `FilterResponse`
  (record: `Samples: List<SampleDto>`).
- `src/backend/ECGViewer.Api/Filters/SampleRateCalculator.cs` (new) — `ComputeSampleRateHz(IReadOnlyList<SampleDto> samples): double`,
  calculado como `1.0 / dtPromedio`, donde `dtPromedio` es el promedio de los deltas de tiempo
  consecutivos (no asume muestreo perfectamente uniforme, pero requiere al menos 2 muestras).
- `src/backend/ECGViewer.Api/Filters/FilterValidation.cs` (new) — funciones de validación puras,
  cada una devuelve `string?` (mensaje de error, o `null` si es válido):
  - `ValidateSampleCount(int count)`: `400` si `count > 500_000` (mitigación del threat model,
    riesgo 1).
  - `ValidateFrequency(double value, double nyquistHz)`: `400` si `value <= 0` o `value > nyquistHz`.
  - `ValidateFrequencyRange(double low, double high, double nyquistHz)`: aplica
    `ValidateFrequency` a ambos, más `400` si `low >= high`.
  - `ValidateWindow(int window, int totalSamples)`: `400` si `window <= 0` o
    `window > totalSamples` (mitigación del threat model, riesgo 2).
  - `ValidatePolynomialDegree(int degree, int window)`: `400` si `degree <= 0` o `degree >= window`.

**Logic**
Estas clases no exponen ningún endpoint todavía — son las piezas puras que los Bloques 2/3
consumen. `ComputeSampleRateHz` refleja exactamente el mismo criterio que
`src/frontend/src/lib/ecg/sampleRate.ts` (Bloque 5): promedio de deltas, no mediana, para que
ambos lados calculen el mismo valor sobre el mismo payload.

**Input validation**
Toda la superficie de validación de este ticket vive en `FilterValidation.cs` — ver arriba. Ninguna
depende de I/O; son funciones puras testeables sin `WebApplicationFactory`.

**Error handling**
- Cada función de validación devuelve el mensaje de error como `string?`; el bloque 2/3/4 las
  invoca en orden y traduce el primer mensaje no-nulo a `Results.BadRequest(new { error })`.
- `ComputeSampleRateHz` con menos de 2 muestras: se documenta como precondición (los bloques que la
  llaman ya validan `ValidateSampleCount` con un mínimo implícito de 2 antes de invocarla).

**Required tests**
- [ ] `FilterValidationTests.RejectsSampleCountOverLimit` — valida la mitigación del threat model
      (riesgo 1: límite de 500.000 muestras); no corresponde a un AC del PRD.
- [ ] `FilterValidationTests.RejectsFrequencyAboveNyquist` — valida AC-11.
- [ ] `FilterValidationTests.RejectsLowGreaterOrEqualHigh` — valida AC-12.
- [ ] `FilterValidationTests.RejectsWindowNotPositiveInteger` — valida AC-13.
- [ ] `FilterValidationTests.RejectsWindowGreaterThanTotalSamples` — mitigación del threat model
      (riesgo 2), no un AC del PRD pero sí un caso de error documentado aquí.
- [ ] `FilterValidationTests.RejectsDegreeGreaterOrEqualWindow` — valida AC-14.
- [ ] `SampleRateCalculatorTests.ComputesAverageDeltaCorrectly` — valida el cálculo base que
      sostiene AC-11.

**Completion criterion**
`dotnet test` sobre estos 7 tests pasa en verde, sin dependencias del endpoint HTTP (son tests de
unidad puros sobre las clases de `Filters/`).

## Block 2 — Filtros espectrales + endpoint (Pasa Bajo/Alto/Banda/Notch)

**Files**
- `src/backend/ECGViewer.Api/ECGViewer.Api.csproj` (modified) — agrega
  `<PackageReference Include="FftSharp" Version="2.2.0" />`.
- `src/backend/ECGViewer.Api/Filters/SpectralFilters.cs` (new) — `ApplyLowPass`, `ApplyHighPass`,
  `ApplyBandPass`, `ApplyNotch`, cada una envolviendo `FftSharp.Filter.LowPass`/`HighPass`/
  `BandPass`/`BandStop` respectivamente sobre el array `double[] mV` de la señal, usando
  `ComputeSampleRateHz` para el parámetro de frecuencia de muestreo que pide `FftSharp`.
- `src/backend/ECGViewer.Api/Program.cs` (modified) — agrega `app.MapPost("/api/filters/apply", ...)`
  con el dispatch para estos 4 tipos (los 3 restantes del Bloque 3 se agregan al mismo `switch` en
  ese bloque).

**Logic**
El handler del endpoint: (1) valida `ValidateSampleCount`, (2) calcula
`nyquistHz = ComputeSampleRateHz(...) / 2`, (3) según `FilterType`, valida los parámetros
correspondientes (`ValidateFrequency` para Pasa Bajo/Alto, `ValidateFrequencyRange` para Pasa
Banda/Notch), (4) si toda validación pasa, invoca la función de `SpectralFilters` correspondiente
sobre el array de amplitudes (`mV`), preservando los timestamps (`t`) originales sin modificar, y
devuelve `Results.Ok(new FilterResponse(...))`.

**API contract**
- Method + path: `POST /api/filters/apply`
- Request (JSON): `{ "samples": [{"t": number, "mV": number}], "filterType": "LowPass"|"HighPass"|"BandPass"|"Notch"|"MovingAverage"|"MovingMedian"|"SavitzkyGolay", "cutoff"?: number, "cutoffLow"?: number, "cutoffHigh"?: number, "window"?: number, "polynomialDegree"?: number }`
- Response 200: `{ "samples": [{"t": number, "mV": number}] }`
- Error codes: `400` con `{ "error": string }` para cualquier validación fallida (Bloque 1).
- Auth: ninguna (mismo alcance aceptado en el threat model de FEAT-007a/b — desarrollo local).

**Error handling**
- Parámetros faltantes para el tipo de filtro elegido (ej. `cutoff` ausente para `LowPass`):
  `400` con `{ "error": "Falta el parámetro 'cutoff' para el filtro seleccionado" }` — test en
  Bloque 4 (`RejectsRequestWithMissingRequiredParameter`).
- Cualquier excepción no anticipada de `FftSharp` (ej. señal con menos de 2 muestras llegando hasta
  acá pese a `ValidateSampleCount`): no se espera en la práctica dado el orden de validaciones, pero
  si ocurriera, no se captura en este bloque — se cubre de forma genérica en el Bloque 4.

**Required tests**
- [ ] `FilterEndpointTests.LowPass_ReturnsFilteredSignal` — valida AC-01/AC-02, AC-06, AC-15.
- [ ] `FilterEndpointTests.HighPass_ReturnsFilteredSignal` — valida AC-02, AC-06, AC-15.
- [ ] `FilterEndpointTests.BandPass_ReturnsFilteredSignal` — valida AC-03, AC-06, AC-15.
- [ ] `FilterEndpointTests.Notch_ReturnsFilteredSignal` — valida AC-03, AC-06, AC-15.
- [ ] `FilterEndpointTests.LowPass_RejectsFrequencyAboveNyquist` — valida AC-11 end-to-end (sad
      path a través del endpoint, no solo de la función de validación).

**Completion criterion**
`dotnet build` sin warnings, y los 5 tests de este bloque en verde vía `dotnet test`.

## Block 3 — Filtros de dominio temporal (Media Móvil, Mediana Móvil, Savitzky-Golay)

**Files**
- `src/backend/ECGViewer.Api/Filters/TimeDomainFilters.cs` (new) — `ApplyMovingAverage(double[] mV, int window)`,
  `ApplyMovingMedian(double[] mV, int window)` (ventana deslizante centrada, con recorte simétrico
  en los bordes), `ApplySavitzkyGolay(double[] mV, int window, int degree)` (ajuste de mínimos
  cuadrados de un polinomio de grado `degree` sobre cada ventana deslizante — coeficientes
  calculados invirtiendo la matriz de Vandermonde de la ventana; `try/catch` alrededor de la
  inversión matricial, mitigación del threat model riesgo 3).
- `src/backend/ECGViewer.Api/Program.cs` (modified) — completa el `switch` del endpoint con los 3
  tipos restantes.

**Logic**
El handler agrega, para estos 3 tipos: `ValidateWindow` (y `ValidatePolynomialDegree` solo para
Savitzky-Golay) antes de invocar la función correspondiente. Cualquier excepción capturada del
`try/catch` de Savitzky-Golay se traduce a `Results.BadRequest(new { error = "No se pudo calcular el filtro con los parámetros dados" })`.

**Error handling**
- `ApplySavitzkyGolay` con una combinación `ventana`/`grado` numéricamente inestable (matriz
  singular o casi singular): capturado por el `try/catch`, traducido a `400` (mitigación del threat
  model, riesgo 3) — nunca una excepción sin controlar que llegue a `UseDeveloperExceptionPage`.

**Required tests**
- [ ] `FilterEndpointTests.MovingAverage_ReturnsFilteredSignal` — valida AC-04, AC-06, AC-15.
- [ ] `FilterEndpointTests.MovingMedian_ReturnsFilteredSignal` — valida AC-04, AC-06, AC-15.
- [ ] `FilterEndpointTests.SavitzkyGolay_ReturnsFilteredSignal` — valida AC-06, AC-15.
- [ ] `FilterEndpointTests.MovingAverage_RejectsWindowNotPositiveInteger` — valida AC-13 end-to-end.
- [ ] `FilterEndpointTests.SavitzkyGolay_RejectsDegreeGreaterOrEqualWindow` — valida AC-14
      end-to-end.
- [ ] `FilterEndpointTests.SavitzkyGolay_RejectsUnstableCombinationWith400` — valida la mitigación
      del threat model (riesgo 3): un `grado`/`ventana` que produce una matriz singular devuelve
      `400`, no `500`.

**Completion criterion**
`dotnet build` sin warnings, y los 6 tests de este bloque en verde vía `dotnet test`. Los 7 tipos de
filtro quedan completos en el endpoint.

## Block 4 — Rechazo multicanal + barrido final de tests del endpoint

**Files**
- `src/backend/ECGViewer.Api/Filters/FilterValidation.cs` (modified) — agrega
  `ValidateChannelCount` (reutilizable, aunque en este DTO no hay concepto de "columnas": se
  valida indirectamente si el payload trae un campo adicional no reconocido por el esquema — ver
  Logic).
- `src/backend/ECGViewer.Api/Filters/FilterEndpointTests.cs` en
  `src/backend/ECGViewer.Tests/` (modified) — se agregan los sad paths restantes de las 16 AC del
  PRD que ningún bloque anterior cubrió explícitamente.

**Logic**
El DTO `FilterRequest.Samples` es una lista de `{t, mV}` — no tiene una noción directa de "canal"
como el CSV (que son columnas). NFR-02 se traduce aquí a: si el JSON del request incluye una
tercera clave numérica por muestra que el DTO no espera (deserialización estricta), .NET rechaza el
payload por sí solo con `400` (comportamiento por defecto de `System.Text.Json` con
`UnmappedMemberHandling.Disallow` configurado explícitamente en este bloque) — se documenta y se
testea que ese rechazo ocurre, en vez de ignorar el campo extra en silencio.

**Error handling**
- Payload con un campo extra por muestra (simulando una tercera "columna"): `400` con mensaje de
  JSON inválido — no se procesa el filtro (NFR-02).

**Required tests**
- [ ] `FilterEndpointTests.RejectsPayloadWithExtraFieldPerSample` — valida NFR-02, AC-16.
- [ ] `FilterEndpointTests.RejectsPayloadOverSampleLimit` — valida la mitigación del threat model
      (riesgo 1) end-to-end (los 500.000 muestras); no corresponde a un AC del PRD.
- [ ] `FilterEndpointTests.BandPass_RejectsLowGreaterOrEqualHigh` — valida AC-12 end-to-end (el
      Bloque 2 cubrió Nyquist pero no este caso para Pasa Banda/Notch específicamente).
- [ ] `FilterEndpointTests.RejectsRequestWithMissingRequiredParameter` — valida el manejo de error
      documentado en el Bloque 2 (parámetro requerido ausente para el tipo de filtro elegido, ej.
      `cutoff` faltante para `LowPass`) — no corresponde a un AC específico del PRD, es un caso de
      entrada inválida (F-SPEC-10).
- [ ] `FilterEndpointTests.RespondsUnder500msForOneMinuteSignal` — valida NFR-01.

**Completion criterion**
`dotnet test` sobre la suite completa de `ECGViewer.Tests` (Bloques 1-4) pasa en verde: 7 (Bloque 1)
+ 5 (Bloque 2) + 6 (Bloque 3) + 5 (Bloque 4) = 23 tests. `dotnet build` sin warnings de nulabilidad.

## Block 5 — Cliente HTTP del front + cálculo de frecuencia de muestreo compartido

**Files**
- `src/frontend/src/lib/ecg/sampleRate.ts` (new) — exporta
  `computeSampleRateHz(signal: ECGSignal): number`, mismo criterio que
  `SampleRateCalculator.cs` (promedio de deltas consecutivos de `t`).
- `src/frontend/src/lib/ecg/sampleRate.test.ts` (new).
- `src/frontend/src/lib/api/filters.ts` (new) — exporta
  `applyFilter(signal: ECGSignal, filterType: FilterType, params: FilterParams): Promise<ApplyFilterResult>`,
  donde `ApplyFilterResult = { ok: true; signal: ECGSignal } | { ok: false; error: string }`.
  Sigue el patrón exacto de `client.ts`: lee `API_BASE` igual, hace `fetch` a
  `${API_BASE}/api/filters/apply`, nunca lanza — cualquier error de red o `400` del backend se
  traduce a `{ ok: false, error }`.
- `src/frontend/src/lib/api/filters.test.ts` (new).

**Logic**
`computeSampleRateHz` replica en TypeScript la misma fórmula que el backend (promedio de deltas,
no mediana) para que el cálculo de Nyquist en cliente (Bloque 7) coincida con el que hace el
servidor — evita que el front habilite "Aplicar filtro" con un valor que el back luego rechaza por
una diferencia de criterio de cálculo.

**Input validation**
`applyFilter` no valida — delega toda la validación al backend (autoritativo) y al Bloque 7
(feedback de UX antes de la llamada). Es un cliente HTTP puro, sin lógica de negocio, igual que
`client.ts`.

**Error handling**
- `fetch` rechazado (backend caído): `{ ok: false, error: 'No se pudo conectar con el backend' }`.
- Respuesta `400` del backend: `{ ok: false, error: <mensaje del backend> }`.
- Cualquier otro código de error HTTP: `{ ok: false, error: 'Error inesperado del servidor' }`.

**Required tests**
- [ ] `sampleRate.test.ts` — calcula correctamente la frecuencia de muestreo sobre una señal de
      ejemplo con `dt` conocido.
- [ ] `filters.test.ts` — `applyFilter` devuelve `{ ok: true, signal }` cuando el backend responde
      200.
- [ ] `filters.test.ts` — `applyFilter` devuelve `{ ok: false, error }` cuando el backend responde
      400 (sad path).
- [ ] `filters.test.ts` — `applyFilter` devuelve `{ ok: false, error }` cuando `fetch` rechaza
      (backend caído, sad path).
- [ ] `filters.test.ts` — `applyFilter` devuelve `{ ok: false, error: 'Error inesperado del
      servidor' }` cuando el backend responde con un código distinto de 200/400 (ej. 500).

**Completion criterion**
`npm test` pasa los 5 tests de este bloque; `npm run typecheck` sigue en verde.

## Block 6 — Extensión de `signalStore`

**Files**
- `src/frontend/src/state/signalStore.ts` (modified) — agrega `previousSignal: ECGSignal | null` al
  estado, y dos acciones: `applyFilter(filterType, params): Promise<{ ok: boolean; error?: string }>`
  y `revertLastFilter(): void`.
- `src/frontend/src/state/signalStore.test.ts` (modified) — tests de las 2 acciones nuevas.

**Logic**
Undo de un solo nivel — excepción documentada y aceptada explícitamente en la sección "Out of
Scope" del PRD (`docs/daw/prd/prd-FEAT-007b.md`) a la regla general de `AGENTS.md` sobre no
modificar destructivamente la señal original: con 2+ filtros encadenados, volver a la señal
original tal como fue cargada requiere recargar el archivo, no está cubierto por "Revertir".

`applyFilter`: lee `signal` actual vía `get()`, llama a `applyFilter` de `lib/api/filters.ts`
(Bloque 5) con la señal actual (no la original — encadenado aditivo, FR-09), y si la respuesta es
`ok`, hace `set({ previousSignal: signal, signal: result.signal })` (guarda la señal pre-filtro
antes de reemplazarla, mismo patrón mutacional que `cropToRange`). Si la respuesta no es `ok`,
no modifica el estado y devuelve el error para que el Bloque 7 lo muestre.
`revertLastFilter`: si `previousSignal` no es `null`, hace
`set({ signal: previousSignal, previousSignal: null })` — sin ninguna llamada de red (FR-08). Si
`previousSignal` es `null`, no-op (no hay nada que revertir).

**Error handling**
- `applyFilter` sin señal cargada (`signal === null`): no-op, devuelve
  `{ ok: false, error: 'No hay una señal cargada' }` sin llamar al backend.
- `revertLastFilter` sin filtro previo aplicado (`previousSignal === null`): no-op silencioso (el
  Bloque 7 ya deshabilita el botón en ese caso, así que este es un guard adicional, no la única
  defensa).

**Required tests**
- [ ] `signalStore.test.ts` — `applyFilter` exitoso actualiza `signal` y guarda la señal previa en
      `previousSignal` — valida FR-06, AC-06.
- [ ] `signalStore.test.ts` — `applyFilter` fallido (mock de `filters.ts` devolviendo `{ok:false}`)
      no modifica `signal` ni `previousSignal` — valida el manejo de error.
- [ ] `signalStore.test.ts` — `applyFilter` llamado dos veces seguidas encadena sobre la señal ya
      filtrada, no sobre la original — valida FR-09, AC-10.
- [ ] `signalStore.test.ts` — `revertLastFilter` restaura `signal` a `previousSignal` y limpia
      `previousSignal` — valida FR-08, AC-09.
- [ ] `signalStore.test.ts` — `revertLastFilter` sin filtro previo es no-op — sad path.
- [ ] `signalStore.test.ts` — `applyFilter` sin señal cargada (`signal === null`) no llama al
      backend y devuelve `{ ok: false, error: 'No hay una señal cargada' }` — sad path.

**Completion criterion**
`npm test` pasa los 6 tests de este bloque, más toda la suite existente sin regresiones (los
consumidores actuales de `useSignalStore` — `CsvUpload`, `ECGChart`, `MetricsPanel` — siguen
funcionando sin cambios, per el impact scan de PLAN).

## Block 7 — Componente `FilterPanel`

**Files**
- `src/frontend/src/components/FilterPanel.tsx` (new) — combo `<select>` nativo con las 7 opciones
  (mismo patrón de `select`/`input` nativos que exige `AGENTS.md`), campos numéricos dinámicos según
  el tipo elegido (con los defaults del PRD: Pasa Bajo 49.5Hz, Pasa Alto 1Hz, Pasa Banda 1-49.5Hz,
  Notch 50-60Hz, Media Móvil ventana=5, Mediana Móvil ventana=7, Savitzky-Golay ventana+grado sin
  default fijado por el PRD — se deja vacío y el botón "Aplicar filtro" permanece deshabilitado
  hasta que el usuario complete ambos campos), botón "Aplicar filtro" (deshabilitado mientras la
  validación client-side falla, o mientras hay una petición en curso), botón "Revertir"
  (deshabilitado por defecto, habilitado solo cuando `previousSignal !== null` en `signalStore`).
- `src/frontend/src/components/FilterPanel.test.tsx` (new).

**Logic**
Validación client-side (feedback inmediato, no autoritativa): usa `computeSampleRateHz` (Bloque 5)
sobre `signal` del store para calcular Nyquist y deshabilitar "Aplicar filtro" si la frecuencia
ingresada lo excede; valida `low < high`, ventana entera positiva, y `grado < ventana` de la misma
forma. Al presionar "Aplicar filtro", llama a `applyFilter` de `signalStore` (Bloque 6); si devuelve
error, lo muestra en un `<p role="alert">` (mismo patrón de mensajes de error que `CsvUpload`, si lo
usa — de lo contrario, un párrafo simple con el mensaje).

**Input validation**
- Nyquist: frecuencia positiva con paso de `0.1` (`<input type="number" step="0.1" min="0">`), y
  comparación contra `computeSampleRateHz(signal) / 2` antes de habilitar "Aplicar filtro".
- `low < high` para Pasa Banda/Notch.
- Ventana: entero positivo (`<input type="number" step="1" min="1">`).
- Grado de polinomio (Savitzky-Golay): entero positivo, y `grado < ventana`.

**Error handling**
- Sin señal cargada: el combo y los botones se muestran deshabilitados (no tiene sentido elegir un
  filtro sin señal).
- Error del backend (`applyFilter` devuelve `{ok:false}`): se muestra el mensaje de error devuelto,
  sin romper el resto del panel — el usuario puede corregir los parámetros y reintentar.

**Required tests**
- [ ] `FilterPanel.test.tsx` — muestra las 7 opciones del combo — valida AC-01.
- [ ] `FilterPanel.test.tsx` — selecciona "Pasa Bajo" y muestra el campo prellenado con 49.5 — valida
      AC-02.
- [ ] `FilterPanel.test.tsx` — selecciona "Notch" y muestra los campos prellenados con 50/60 — valida
      AC-03.
- [ ] `FilterPanel.test.tsx` — selecciona "Media Móvil"/"Mediana Móvil" y muestra la ventana
      prellenada con 5/7 — valida AC-04.
- [ ] `FilterPanel.test.tsx` — selecciona "Savitzky-Golay" y muestra los campos "Ventana" y "Grado
      de Polinomio" — valida AC-05.
- [ ] `FilterPanel.test.tsx` — "Aplicar filtro" deshabilitado mientras "Revertir" también lo está,
      y "Revertir" se habilita tras un `applyFilter` exitoso — valida AC-07, AC-08.
- [ ] `FilterPanel.test.tsx` — ingresar una frecuencia que excede Nyquist deshabilita "Aplicar
      filtro" y muestra un mensaje — valida AC-11 (capa de UX).
- [ ] `FilterPanel.test.tsx` — ingresar `low >= high` deshabilita "Aplicar filtro" — valida AC-12
      (capa de UX).
- [ ] `FilterPanel.test.tsx` — ingresar una ventana no entera/no positiva deshabilita "Aplicar
      filtro" — valida AC-13 (capa de UX).
- [ ] `FilterPanel.test.tsx` — para Savitzky-Golay, `grado >= ventana` deshabilita "Aplicar filtro"
      — valida AC-14 (capa de UX).
- [ ] `FilterPanel.test.tsx` — sin señal cargada, el combo y ambos botones están deshabilitados —
      sad path.
- [ ] `FilterPanel.test.tsx` — cuando `applyFilter` del store devuelve error, se muestra el mensaje
      en un `role="alert"` sin desmontar el resto del panel — sad path.

**Completion criterion**
`npm test` pasa los 11 tests de este bloque; `npm run typecheck` y `npm run lint` en verde.

## Block 8 — Montaje en `App.tsx`

**Files**
- `src/frontend/src/App.tsx` (modified) — import de `FilterPanel` en orden alfabético, montado
  entre `<ChartToolbar />` y `<ECGChart />` (confirmado con el usuario en PLAN).

**Logic**
Cambio puramente aditivo: una línea de import y un elemento nuevo en el árbol JSX, sin reordenar
nada existente.

**Error handling**
No aplica — `FilterPanel` ya maneja sus propios estados de error (Bloque 7).

**Required tests**
- [ ] Ningún test nuevo específico de `App.tsx` — se verifica manualmente en la Verificación Final
      que `FilterPanel` aparece en la posición esperada del DOM.

**Completion criterion**
`npm run build` (`tsc --noEmit && vite build`) en verde; `FilterPanel` visible entre `ChartToolbar`
y `ECGChart` al renderizar la app.

## Final verification

- `dotnet build` (solución completa) y `dotnet test` (23 tests) en verde, sin warnings de
  nulabilidad.
- `npm run typecheck`, `npm run lint`, `npm test` (con los ~18 tests nuevos de los Bloques 5-7) y
  `npm run build` en verde.
- Levantando ambos servicios, aplicar cada uno de los 7 filtros sobre una señal cargada produce un
  cambio visible en el gráfico; "Revertir" deshuelve exactamente el último filtro aplicado sin
  llamar al backend; aplicar 2 filtros en secuencia y revertir uno deja el otro intacto.
- Las tres mitigaciones del threat model (límite de 500.000 muestras, ventana≤total de muestras,
  try/catch numérico en Savitzky-Golay) están implementadas tal como se describen en los Bloques 1,
  3 y 4.
