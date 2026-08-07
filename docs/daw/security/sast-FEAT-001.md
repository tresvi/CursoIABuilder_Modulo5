# SAST Report — FEAT-001: Cargar señal ECG de un canal desde CSV (RF-01)

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Fecha | 2026-08-07 |
| Tier | FEATURE |
| Alcance | `src/frontend/` (código y dependencias) |
| Resultado | **PASSED** |

## 1. Escaneo de código

| Categoría | Regla | Resultado |
|-----------|-------|-----------|
| Secretos hardcodeados | F-SAST-01 | ✅ Sin secretos. `.env` / `.env.*` ignorados en `.gitignore`. |
| SQL/NoSQL injection | F-SAST-02 | ✅ N/A — sin base de datos ni queries (front-only). |
| Command injection | F-SAST-03 | ✅ N/A — sin `exec`/`spawn`/`child_process`. |
| Path traversal | F-SAST-05 | ✅ N/A — lectura vía File API del navegador, sin rutas de FS. |
| XSS | F-SAST-06 | ✅ Sin `dangerouslySetInnerHTML` ni `innerHTML` con input. Mensajes de error de texto fijo por tipo (mitigación R2 del threat model); nunca se incrusta contenido crudo del archivo. Las únicas apariciones de `dangerouslySetInnerHTML`/`innerHTML` son un comentario y una aserción de test. |
| Unsafe functions | F-SAST-17 | ✅ Sin `eval`/`Function`/deserialización insegura. |
| Debug en producción | F-SAST-09 | ✅ Sin `console.log` de datos sensibles. |
| Upload sin restricción | F-SAST-11 | ✅ Guardia de tamaño (≤ 25 MB) antes de leer (mitigación R1); solo se parsea texto en memoria, no se sube ni ejecuta nada. |
| Validación de entrada | F-SAST-14 | ✅ Validación estricta de dominio en `parseCsv` (columnas, numérico, multicanal) y de tamaño/tipo en `CsvUpload`. |

## 2. Auditoría de dependencias (F-SAST-13)

### Hallazgo inicial (BLOQUEANTE)

`npm audit` reportó **7 vulnerabilidades** (1 crítica, 1 alta, 3 moderadas, 2 bajas), todas en
**dependencias de desarrollo** (test runner y dev-server): `vitest`, `vite`, `esbuild`,
`@vitest/mocker`, `vite-node`, `@eslint/plugin-kit`, `eslint`. Ninguna viaja en el bundle de
producción (`dist/` = React + código de app + papaparse + zustand). Los avisos crítico/alto se
originaban en que **Vitest 2 anidaba Vite 5** (`vitest/node_modules/vite@5.4.21`), cuyo dev-server
tiene los avisos GHSA-vg6x-rcgg-rjx6 / GHSA-x574-m823-4x7w / GHSA-67mh-4wv8-2f99, y `npm audit` los
escalaba a través de la cadena `vitest → vite5`.

### Remediación aplicada (decisión del usuario: subir a Vitest 4)

Como Crítica/Alta **no son suprimibles** (catálogo §4.1), se corrigieron actualizando a versiones
parcheadas:

| Dependencia | Antes | Después | Motivo |
|-------------|-------|---------|--------|
| `vitest` | 2.1.8 | **4.1.10** | Elimina la RCE crítica (GHSA-9crc-q9x8-hgqq) y la anidación de Vite 5; ahora usa Vite 6. |
| `vite` | 6.0.5 | **6.4.3** | Elimina el aviso alto del dev-server (GHSA-vg6x-rcgg-rjx6). |
| `eslint` | 9.17.0 | **9.39.5** | Elimina las 2 bajas de ReDoS en `@eslint/plugin-kit` (GHSA-xffm-g5w8-qvg7). |

### Resultado final

```
npm audit → found 0 vulnerabilities
```

Suite completa **18/18** verde bajo Vitest 4; `tsc --noEmit`, ESLint y `vite build` verdes.

## 3. Desvío documentado respecto de la spec

La spec `spec-FEAT-001.md` (Block 1) fijaba **Vitest 2**. La remediación de seguridad —forzada por el
gate SAST y decidida explícitamente por el usuario (raul, dueño del riesgo)— la elevó a **Vitest 4**.
No existe arista `CODE → PLAN` en el grafo del tier FEATURE, por lo que la spec no puede editarse en
esta fase; el desvío queda registrado aquí y reflejado en `AGENTS.md` (sección "Stack", Test runner
→ Vitest 4). Vitest 4 no requirió cambios en los tests (API compatible para los usos del proyecto).

## 4. Supresiones

Ninguna. Todas las vulnerabilidades se corrigieron; no se suprimió ninguna.

---

**Total: código limpio; 0 vulnerabilidades en dependencias. Resultado: PASSED.**
