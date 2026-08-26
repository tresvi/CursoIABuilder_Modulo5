# Threat Model FEAT-007b: Filtros DSP

| Field | Value |
|-------|-------|
| Ticket | FEAT-007b |
| Date | 2026-08-26 |
| Result | PASSED (mitigaciones incorporadas) |

## Attack surfaces identificadas

1. **`POST /api/filters/apply`** (nuevo endpoint) — acepta la señal completa (array de muestras),
   tipo de filtro y parámetros numéricos del usuario. Primer endpoint del proyecto que procesa un
   payload potencialmente grande y de tamaño variable (a diferencia de `/api/health`, que no acepta
   input).
2. **`FftSharp.Filter.LowPass/HighPass/BandPass/BandStop`** — procesan arrays numéricos in-memory,
   sin llamadas de red externas ni deserialización insegura.
3. **Implementación propia de Media Móvil / Mediana Móvil / Savitzky-Golay** — código nuevo del
   proyecto, sin dependencias externas, pero con parámetros (`ventana`, `grado`) controlados por el
   usuario que afectan directamente el costo computacional y la estabilidad numérica.
4. **Validación server-side** (Nyquist, low<high, ventana entera positiva, grado<ventana) — gatekeeper
   antes de procesar cualquier filtro.

## Trust boundaries

- **Navegador (front) ↔ `ECGViewer.Api`**: mismo límite que FEAT-007a (origen `http://localhost:5173`
  vía CORS, sin autenticación). Este ticket no cambia el límite de confianza, pero sí introduce el
  primer endpoint que acepta un payload de tamaño variable a través de ese límite — la superficie de
  DoS crece en consecuencia (ver riesgo 1 abajo).

## STRIDE por componente

### `POST /api/filters/apply`
| Categoría | Evaluación |
|---|---|
| Spoofing | Sin identidad que suplantar (mismo alcance que FEAT-007a). |
| Tampering | El usuario controla el payload completo (señal + parámetros) — no hay estado persistido que pueda corromperse; el peor caso es un resultado de filtrado incorrecto, no una vulneración de integridad de datos ajenos. |
| Repudiation | Sin logging de requests — aceptable: no hay ninguna acción con consecuencias para terceros que auditar. |
| Information Disclosure | La respuesta es la señal filtrada, derivada del mismo input del usuario — no expone nada que el usuario no haya enviado. |
| Denial of Service | **Riesgo real, nuevo en este ticket**: el endpoint acepta un array de muestras sin límite de tamaño explícito, y filtros con `ventana`/`grado` grandes tienen costo computacional creciente (especialmente Savitzky-Golay, que requiere resolver un sistema de mínimos cuadrados por ventana). Ver riesgo 1. |
| Elevation of Privilege | No aplica — sin niveles de privilegio en este ticket. |

## Riesgos identificados

| Riesgo | STRIDE | Likelihood | Impact | Mitigación |
|---|---|---|---|---|
| 1. Payload sin límite de tamaño (DoS por agotamiento de memoria/CPU) | DoS | Medium | High | 🟠 **Mitigación obligatoria**: el endpoint debe rechazar con `400` cualquier payload cuyo número de muestras exceda un límite explícito, consistente en orden de magnitud con el guardia de 25MB ya existente para la carga de CSV (`AGENTS.md`/FEAT-001). Se incorpora a la spec como validación de entrada explícita, antes de procesar cualquier filtro. |
| 2. `ventana` mayor al número de muestras de la señal (no cubierto por el PRD, que solo exige "entero positivo") | DoS/Information Disclosure (stack trace) | Medium | Medium | 🟡 Mitigación: agregar validación adicional — `ventana` no puede exceder el total de muestras de la señal recibida, `400` si ocurre. Se documenta en la spec como parte del manejo de errores de cada filtro de dominio temporal (no requiere cambio de PRD: es un detalle de robustez, no un requisito nuevo). |
| 3. Savitzky-Golay con combinaciones `ventana`/`grado` numéricamente inestables (matriz singular) | DoS/Information Disclosure | Low | Medium | 🟡 Mitigación: capturar cualquier excepción numérica de la implementación de Savitzky-Golay y devolver `400` con un mensaje genérico, nunca una excepción no controlada con stack trace — consistente con la mitigación de "manejo de excepciones por entorno" de FEAT-007a (`UseDeveloperExceptionPage` confinado a `Development`). |
| 4. CORS / endpoint sin autenticación | Spoofing/DoS | Low | Low | 🟢 Ya mitigado y aceptado en el threat model de FEAT-007a (mismo componente `Program.cs`, sin cambios en la política CORS) — no se reevalúa aquí. |

## Clasificación de datos sensibles (F-TM-05)

Igual que FEAT-007a: la señal ECG no contiene PII ni credenciales en el alcance de este proyecto
(datos de investigación/educativos, sin identificar al paciente). No aplica cifrado en tránsito/reposo
(F-TM-07) más allá de lo ya aceptado para el entorno de desarrollo local.

## Mitigaciones a incorporar en la spec

1. **Límite explícito de tamaño de payload** (riesgo 1, HIGH): el endpoint valida el número de
   muestras recibidas contra un máximo explícito antes de procesar cualquier filtro; rechaza con
   `400` si se excede.
2. **Validación de `ventana` contra el total de muestras** (riesgo 2): agregar a la validación de
   Media Móvil, Mediana Móvil y Savitzky-Golay.
3. **Manejo de excepciones numéricas de Savitzky-Golay** (riesgo 3): try/catch específico que
   traduce cualquier falla de cómputo a `400`, nunca una excepción sin controlar.

---

```
┌─────────────────────────────────────────────────────────┐
│  /daw-threat-modeling — PASSED                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Attack surfaces identified: 4                            │
│  Trust boundaries declared: 1 (heredado de FEAT-007a)      │
│                                                          │
│  Risks:                                                  │
│    🟠 HIGH: payload sin límite de tamaño — Mitigation:     │
│       validación de máximo de muestras, 400 si se excede   │
│    🟡 MEDIUM: ventana > total de muestras — Mitigation:     │
│       validación adicional en los 3 filtros temporales      │
│    🟡 MEDIUM: Savitzky-Golay numéricamente inestable —       │
│       Mitigation: try/catch → 400, nunca stack trace          │
│    🟢 LOW: CORS/sin auth — ya aceptado en FEAT-007a             │
│                                                          │
│  Mitigations to fold into the spec:                        │
│    1. Límite de tamaño de payload (máx. de muestras)         │
│    2. Validación ventana ≤ total de muestras                 │
│    3. Try/catch numérico en Savitzky-Golay → 400              │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│  Risks: C:0 H:1 M:2 L:1                                    │
│  Report: docs/daw/security/threat-FEAT-007b.md              │
└─────────────────────────────────────────────────────────┘
```
