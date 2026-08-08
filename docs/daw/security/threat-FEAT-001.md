# Threat Model — FEAT-001: Cargar señal ECG de un canal desde CSV (RF-01)

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Fecha | 2026-08-06 |
| Tier | FEATURE |
| Diseño evaluado | Bloque 1 (scaffolding), Bloque 2 (parseCsv + tipos, PapaParse), Bloque 3 (CsvUpload + store Zustand) |

## Alcance y arquitectura real evaluada (F-TM-06)

Feature **exclusivamente front-end**, sin back-end, sin API, sin base de datos. Flujo:

```
[Archivo local del usuario] --(File API / drag&drop)--> CsvUpload.tsx
      --> parseCsv.ts (PapaParse + validación de dominio)
      --> signalStore.ts (Zustand, memoria volátil)
      --> render de éxito/error en el DOM (React)
```

No hay llamada de red en este ticket (`VITE_API_BASE` no participa). La señal ingresada vive en
memoria del navegador; no se persiste (RF-15 fuera de alcance) ni se transmite.

## Superficies de ataque identificadas: 2

1. **Entrada de archivo no confiable** (CsvUpload → parseCsv): el usuario aporta contenido
   arbitrario que el parser procesa.
2. **Cadena de suministro** (nuevas dependencias): `papaparse`, `@types/papaparse`, `zustand`.

## Fronteras de confianza declaradas (F-TM-02): 1

- **TB-1:** Archivo local del sistema del usuario (no confiable) → aplicación en el navegador. El
  cruce ocurre al leer el `File` y pasar su texto a `parseCsv`. Toda la validación de dominio actúa
  en esta frontera.

*(No existe frontera navegador↔servidor ni app↔DB en este ticket: no hay back-end involucrado.)*

## Clasificación de datos (F-TM-05, F-TM-07)

| Dato | Clasificación | En reposo | En tránsito |
|------|---------------|-----------|-------------|
| Señal ECG cargada | Dato de usuario potencialmente biomédico, **local y volátil** | Solo en memoria del navegador; **no se persiste** en este ticket | **No se transmite** (sin red) |
| Credenciales / tokens / datos financieros | Ninguno | — | — |

No hay PII persistida ni credenciales: F-TM-07 (cifrado en reposo/tránsito) **no aplica** — el dato
no sale del proceso del navegador ni se guarda. Si un ticket futuro persiste estudios (RF-15) o los
envía a la API, deberá rehacerse esta clasificación.

## Análisis STRIDE por componente

### CsvUpload.tsx + parseCsv.ts (unidad de carga/parseo)

| STRIDE | Evaluación | Riesgo |
|--------|-----------|--------|
| **Spoofing** | App de libre acceso, sin identidades ni login (fuera de alcance por diseño). Sin superficie. | N/A |
| **Tampering** | El archivo puede estar malformado/manipulado. Mitigado por validación estricta (2 columnas, numérico, coma/punto, rechazo multicanal e inconsistentes). | 🟢 LOW |
| **Repudiation** | Sin cuentas ni operaciones auditables; herramienta local. No se requiere logging de auditoría. | N/A |
| **Information Disclosure** | El dato no se transmite. Riesgo secundario: reflejar contenido crudo del archivo en mensajes de error → XSS. | 🟡 MEDIUM |
| **Denial of Service** | Un archivo muy grande (muchas muestras o multi-GB malicioso) puede congelar el hilo principal o agotar memoria del tab. | 🟡 MEDIUM |
| **Elevation of Privilege** | Sin modelo de privilegios. Sin superficie. | N/A |

### signalStore.ts (Zustand)

| STRIDE | Evaluación | Riesgo |
|--------|-----------|--------|
| **Tampering** | Estado solo mutable por código de la app; sin exposición externa. | 🟢 LOW |
| **Information Disclosure** | Memoria volátil, no persistida. | 🟢 LOW |
| Resto | Sin superficie (sin identidad, red ni privilegios). | N/A |

### Dependencias nuevas (cadena de suministro — W-TM-01)

| Riesgo | Evaluación |
|--------|-----------|
| `papaparse`, `zustand`, `@types/papaparse` introducen código de terceros. | 🟢 LOW: librerías ampliamente usadas y mantenidas; versiones fijadas en `package.json`; `npm audit` cubierto por el gate SAST en CODE. |

## Riesgos y mitigaciones

| # | Riesgo | STRIDE | Prob. | Impacto | Mitigación |
|---|--------|--------|-------|---------|------------|
| R1 | DoS: archivo demasiado grande congela el hilo/agota memoria | D | Media | Media (solo el tab del usuario; sin multiusuario) | Guardia de **tamaño máximo de archivo** antes de parsear (rechazo con mensaje); considerar parseo con Web Worker/streaming de PapaParse; validar contra NFR-01 (archivo de 1 min ≈ 30.000 muestras). |
| R2 | XSS reflejado por incrustar contenido crudo del archivo en mensajes de error | I | Baja | Media | **No** usar `dangerouslySetInnerHTML`; mensajes de error estructurados/genéricos que no reinyecten bytes crudos del archivo; apoyarse en el escapado por defecto de React. |
| R3 | CSV malformado/manipulado ingresado como señal | T | Baja | Baja | Validación estricta ya especificada (AC-04/AC-05): ante cualquier desvío, informar y no procesar. |
| R4 | Vulnerabilidad en dependencia de terceros | — | Baja | Media | Fijar versiones; `npm audit` en el gate SAST (CODE); revisar avisos. |

## Mitigaciones a incorporar en la spec

1. **(R1)** Definir un límite de tamaño de archivo y rechazar los que lo superen con un mensaje claro, antes de invocar el parser. Valor concreto a fijar en la spec (propuesta: 10 MB) y medir el caso de referencia contra NFR-01.
2. **(R2)** Renderizar mensajes de error sin `dangerouslySetInnerHTML` y sin incrustar contenido crudo del archivo; usar mensajes estructurados por tipo de error.
3. **(R4)** Fijar versiones exactas de `papaparse`/`zustand` en `package.json` y apoyarse en `npm audit` durante el gate SAST.

---

**Riesgos: C:0 H:0 M:2 L:2** — sin riesgos CRITICAL/HIGH. Todos los MEDIUM tienen mitigación que se
pliega a la spec. Veredicto: **PASSED**.
