# Threat Model — FEAT-002: Gráfico ECG (visualización, zoom, rejilla) (RF-02/06/07)

| Field | Value |
|-------|-------|
| Ticket | FEAT-002 |
| Fecha | 2026-08-09 |
| Tier | FEATURE |
| Diseño evaluado | B1 (lógica pura de render), B2 (viewStore), B3 (ECGChart + render/, Canvas 2D), B4 (ChartToolbar + integración) |

## Alcance y arquitectura real evaluada (F-TM-06)

Feature **exclusivamente front-end**, sin back-end, sin API, sin base de datos, **sin dependencias
nuevas** y **sin red**. Flujo:

```
signalStore (señal ya cargada y validada en FEAT-001)
   → ECGChart deriva el rango [t0, tN] y lo pasa a viewStore (initForSignal)
   → render puro (lib/ecg/chart): mapeo tiempo→X / amplitud→Y, ticks, decimación
   → Canvas 2D (lienzo base señal/ejes/rejilla + overlay de interacción)
   ← mouse (arrastre de zoom) → cálculo de rango → viewStore.setZoomWindow
```

Todo ocurre en memoria del navegador. La señal ya fue validada en la carga (FEAT-001); este ticket
solo la **lee y dibuja**. La única entrada nueva es la **interacción de mouse** (coordenadas de
arrastre para el zoom).

## Superficies de ataque identificadas: 1 (menor)

1. **Interacción de mouse (arrastre de zoom)**: coordenadas de píxel que se traducen a un rango de
   tiempo. Entrada acotada al lienzo; no es texto ni llega a ningún sink peligroso.

*(No hay entrada de archivos ni de red nueva: la señal proviene del store, ya validada.)*

## Fronteras de confianza (F-TM-02)

- **Ninguna nueva.** No hay cruce navegador↔servidor ni app↔DB en este ticket. La señal ya está del
  lado confiable (en memoria, validada). El mouse es entrada del propio usuario sobre su sesión.

## Clasificación de datos (F-TM-05, F-TM-07)

| Dato | Clasificación | En reposo | En tránsito |
|------|---------------|-----------|-------------|
| Señal ECG (leída del store) | Dato de usuario potencialmente biomédico, **local y volátil** | Solo en memoria; no se persiste | No se transmite |
| Estado de vista (ventana visible, rejilla, herramienta) | Ajuste de UI, no sensible | Volátil en memoria | — |

Sin PII persistida ni credenciales: F-TM-07 (cifrado) **no aplica** — nada sale del navegador ni se
guarda.

## Análisis STRIDE

### ECGChart + render + viewStore (unidad de visualización)

| STRIDE | Evaluación | Riesgo |
|--------|-----------|--------|
| **Spoofing** | App de libre acceso, sin identidades. Sin superficie. | N/A |
| **Tampering** | El estado de vista solo lo muta el código de la app vía acciones del store. La señal se lee, no se altera (el render no modifica `signal`). | 🟢 LOW |
| **Repudiation** | Sin cuentas ni operaciones auditables. | N/A |
| **Information Disclosure** | El dato no se transmite. Las etiquetas de ejes son **números formateados por la app**, no contenido crudo del archivo → sin vector de reflexión. Canvas dibuja píxeles, no HTML. | 🟢 LOW |
| **Denial of Service** | Dibujar ~30.000+ puntos por frame podría congelar el hilo principal o degradar el render. | 🟡 MEDIUM |
| **Elevation of Privilege** | Sin modelo de privilegios. | N/A |

### Dependencias

- **Ninguna nueva** (Canvas 2D nativo, sin librería de charting). Sin superficie de cadena de
  suministro añadida en este ticket.

## Riesgos y mitigaciones

| # | Riesgo | STRIDE | Prob. | Impacto | Mitigación |
|---|--------|--------|-------|---------|------------|
| R1 | DoS: render de una señal grande congela el hilo / baja de 10 fps | D | Media | Media (solo el tab del usuario) | **Decimación de puntos por píxel** (no dibujar más de ~1–2 vértices por columna) + **lienzo base separado del overlay** (no redibujar la señal en cada mousemove); medir contra el archivo de referencia de 1 min (RNF-01/02). |
| R2 | Coordenadas de arrastre fuera de rango producen una ventana inválida (fromTime>toTime, o fuera de la señal) | T | Baja | Baja | Clampear el rango de zoom a `[t0, tN]` y descartar arrastres de ancho nulo/despreciable (AC-05); `fromTime<toTime` garantizado por construcción. |

## Mitigaciones a incorporar en la spec

1. **(R1)** Decimación por píxel en el render y separación lienzo base / overlay de interacción; validar el objetivo de rendimiento (RNF-01/02) con el archivo de referencia.
2. **(R2)** Clamping del rango de zoom a los límites de la señal y descarte de arrastres despreciables (ya cubierto por AC-05); el estado `visibleWindow` mantiene la invariante `t0 ≤ fromTime < toTime ≤ tN`.

---

**Riesgos: C:0 H:0 M:1 L:2** — sin riesgos CRITICAL/HIGH. El MEDIUM (R1) tiene mitigación plegada a
la spec. Veredicto: **PASSED**.
