# Threat Model FEAT-005: Herramienta Recorte (RF-09)

| Field | Value |
|-------|-------|
| Ticket | FEAT-005 |
| Spec | docs/daw/specs/spec-FEAT-005.md |
| Date | 2026-08-23 |

## Contexto

ECGViewer es una app sin usuarios ni sesiones (AGENTS.md: "de libre acceso"), sin backend
involucrado en este ticket: todo el flujo de Recorte (arrastre → confirmación → recorte de
`signal`/`markers`) ocurre íntegramente en el navegador, en memoria (Zustand), sin llamadas de red
ni persistencia. No hay `fetch`/`XMLHttpRequest` nuevos, no hay endpoint nuevo, no hay dato que
cruce a un servidor.

## Trust boundaries

- **DOM (eventos de mouse del usuario) → handlers de React (`ECGChart.onMouseDown/Move/Up`)**:
  única entrada externa del feature. El usuario controla directamente `clientX`/`clientY`, pero el
  actor y el dato manipulado son la misma persona en la misma sesión de navegador — no hay cruce
  entre actores con distinto nivel de confianza (no hay multiusuario). Se declara igual, por ser el
  único punto donde entra un valor no controlado por el código (F-TM-02).
- **`ECGChart` (componente de presentación) → `signalStore`/`markersStore` (estado de aplicación)**:
  límite ya existente (Zustand, ADR-001), sin cambios de arquitectura en este ticket — Block 5 solo
  agrega dos llamadas nuevas (`cropToRange`, `removeMarkersOutside`) al mismo patrón que ya usan
  `setZoomWindow`/`removeMarker`.

No hay límite cliente↔servidor ni servidor↔BD en el alcance de este ticket.

## Análisis STRIDE por componente

### `lib/ecg/crop.ts` (`cropSignal`, Block 1) — función pura, sin estado

| STRIDE | Evaluación |
|---|---|
| Spoofing | N/A — no hay identidad que suplantar. |
| Tampering | El único dato de entrada es `range: TimeWindow`, ya validado río arriba por `pixelRangeToWindow` (garantiza `fromTime < toTime`, reusado sin cambios de FEAT-002). No hay ruta que llame a `cropSignal` con un rango no validado. |
| Repudiation | N/A — sin logging ni multiusuario; app de sesión única sin persistencia (AGENTS.md). |
| Information Disclosure | N/A — no expone datos fuera del proceso del navegador del propio usuario. |
| Denial of Service | `Array.filter` en O(n) sobre `samples`; recortar reduce el tamaño de la señal, nunca lo aumenta. No introduce un vector de degradación nuevo respecto a la carga inicial (RF-01, ya mitigado con guard de tamaño de archivo en `signalStore`). |
| Elevation of Privilege | N/A — no hay niveles de privilegio en la app. |

### `signalStore.cropToRange` (Block 2)

| STRIDE | Evaluación |
|---|---|
| Spoofing | N/A. |
| Tampering | Reemplaza `signal` en memoria del propio navegador del usuario; no hay otro actor que pueda interferir con esa mutación (single-threaded, sin workers concurrentes tocando el store). |
| Repudiation | N/A. |
| Information Disclosure | N/A — la señal ya estaba en memoria del cliente antes del recorte (RF-01); recortarla no la expone a nadie nuevo, al contrario, reduce el conjunto de datos retenido. |
| Denial of Service | No-op seguro ante `signal === null` o rango degenerado (ver Block 1/2 del spec) — no hay excepción no controlada que pueda colgar el hilo de UI. |
| Elevation of Privilege | N/A. |

### `markersStore.removeMarkersOutside` (Block 3)

Mismo perfil que `cropToRange`: `filter` en memoria, sin entrada externa no validada, sin
persistencia. Sin hallazgos.

### `ECGChart` + `ConfirmDialog` (Block 5) — integración

| STRIDE | Evaluación |
|---|---|
| Spoofing | N/A. |
| Tampering | El texto del `ConfirmDialog` (`description`) interpola `formatMarkerTime(pendingCrop.fromTime/toTime)` — ambos son `number` formateados por una función pura (`format.ts`), nunca texto libre del usuario. `ConfirmDialog` ya usa interpolación JSX estándar (nunca `dangerouslySetInnerHTML`, mitigación heredada de FEAT-003b) — no se introduce una superficie de XSS nueva, a diferencia del cartel de "eliminar marcador" que sí interpola `label` (texto libre del usuario), un caso ya cubierto por el threat model de FEAT-003b. |
| Repudiation | N/A. |
| Information Disclosure | N/A. |
| Denial of Service | El modal es bloqueante por diseño (NFR-02): esto es la mitigación buscada, no un riesgo — impide que un recorte se aplique sin que el usuario lo vea venir. |
| Elevation of Privilege | N/A. |

## Riesgos identificados

| Risk | STRIDE | Likelihood | Impact | Mitigación propuesta |
|---|---|---|---|---|
| Recorte accidental irreversible (el usuario pierde datos de la señal sin quererlo) | Tampering (de los propios datos del usuario, por error de uso, no por un atacante) | Medium | Medium | Ya cubierta por diseño: NFR-02 exige `ConfirmDialog` bloqueante con el rango explícito antes de aplicar el cambio (AC-03), y el recorte queda fuera de alcance de deshacer solo tras confirmación explícita (PRD, Out of Scope) — el usuario tiene una oportunidad clara de cancelar (AC-06). No requiere mitigación adicional. |
| Marcadores eliminados silenciosamente junto con el recorte (`removeMarkersOutside`) sin aviso explícito de cuántos se pierden | Tampering / pérdida de datos del usuario | Low | Low | Aceptado sin mitigación adicional: el `ConfirmDialog` ya avisa "esta acción no se puede deshacer" antes de recortar, y los marcadores fuera del nuevo rango apuntan a instantes que ya no existen en la señal — su eliminación es la consecuencia lógica y esperada del recorte, no un efecto oculto no relacionado. |

No se identificaron riesgos CRITICAL o HIGH: el feature es puramente cliente, en memoria, sin datos
sensibles, sin red y sin persistencia — el único activo protegido es la propia sesión de trabajo del
usuario, y la mitigación principal (confirmación explícita antes de un cambio irreversible) ya forma
parte del diseño aprobado en el PRD/spec, no es un agregado de este análisis.

## Datos sensibles (F-TM-05)

No aplica: la señal ECG y los marcadores de este ticket no son PII (no hay identificación de
paciente en el modelo de datos — `ECGSample = {t, mV}`, `Marker = {id, time, label}`, ninguno
vincula a una persona identificable), no son credenciales, no son datos financieros. Se clasifican
como **datos de sesión de trabajo, volátiles, sin persistencia** (AGENTS.md), igual que en los
threat models previos (FEAT-002/003a/003b/004). F-TM-07 (cifrado) no aplica al no haber PII ni
credenciales.

## Dependencias de terceros (W-TM-01)

Ninguna dependencia nueva: Block 1-5 usan solo TypeScript/React/Zustand ya presentes en el stack.

## Riesgos de disponibilidad (W-TM-02)

Cubierto arriba en DoS por componente: sin vectores nuevos, complejidad O(n) sobre datos ya en
memoria del cliente.

---

**Resultado: PASSED.** Todos los componentes nuevos/modificados tienen análisis STRIDE completo
(F-TM-01), los trust boundaries están declarados (F-TM-02), los riesgos identificados tienen
mitigación documentada (F-TM-03, ninguno requirió "accepted risk" formal), no hay datos sensibles
sin clasificar (F-TM-05), y el análisis referencia la arquitectura concreta de la spec (F-TM-06).
