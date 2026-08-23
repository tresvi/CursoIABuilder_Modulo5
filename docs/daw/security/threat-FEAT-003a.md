# Threat Model FEAT-003a: Crear y listar marcadores de evento (RF-03)

| Field | Value |
|-------|-------|
| Ticket | FEAT-003a |
| Spec | docs/daw/specs/spec-FEAT-003a.md |
| Date | 2026-08-23 |

## Componentes nuevos/modificados (spec-FEAT-003a.md)

1. `ChartToolbar` — botón "Marcar" (Block 3).
2. `ECGChart` — captura de clic simple, cálculo `xToTime`, apertura de `MarkerForm` (Block 1, 5).
3. `MarkerForm` — formulario/diálogo shadcn/ui que recibe la etiqueta del marcador (Block 4).
4. `markersStore` — estado en memoria de los marcadores (Block 2).
5. `drawMarkers` / `drawChart` — render de marcadores en Canvas (Block 5).
6. `MarkerList` — panel que renderiza etiqueta y tiempo de cada marcador (Block 6).
7. **Nueva dependencia de terceros**: `@radix-ui/react-dialog`, `lucide-react` (shadcn/ui).

## Trust boundaries

- **Usuario (input de teclado en `<input>` de `MarkerForm`) → estado de React/`markersStore`**: única
  frontera de confianza real de este ticket. Todo lo demás (store → render Canvas → `MarkerList`)
  ocurre dentro del mismo proceso de browser, sin llamadas de red ni backend (no hay endpoint nuevo:
  `AGENTS.md` confirma que persistencia — RF-15 "Guardar" — está fuera de alcance de este ticket).
- No hay frontera cliente↔servidor nueva: los marcadores no se envían a `ECGViewer.Api` en este
  ticket (NFR-01 de la spec los mantiene solo en memoria de sesión).
- **Frontera de supply chain**: la app ↔ el paquete de terceros `@radix-ui/react-dialog` +
  `lucide-react`, ejecutado con los mismos privilegios que el resto del bundle del front-end.

## Análisis STRIDE por componente

### 1. `MarkerForm` (input de etiqueta)

| Categoría | Análisis |
|---|---|
| Spoofing | N/A — no hay identidad de usuario en esta app (sin login, `AGENTS.md`). |
| Tampering | El usuario controla el contenido de `label` libremente; no hay integridad a proteger más allá de lo que él mismo escribe. |
| Repudiation | N/A — no hay logging de acciones ni multi-usuario. |
| **Information Disclosure** | El campo es texto libre: un usuario podría pegar información sensible propia en la etiqueta. Como no hay persistencia ni transmisión de red en este ticket, el dato no sale del navegador — riesgo bajo, pero documentado. |
| **Denial of Service** | Sin `maxLength`, un texto extremadamente largo podría degradar el render de `MarkerList`/Canvas. Mitigado por Block 4 (`maxLength={200}`). |
| Elevation of Privilege | N/A — no hay niveles de privilegio en la app. |

### 2. `markersStore` / `MarkerList` (renderizado de la etiqueta)

| Categoría | Análisis |
|---|---|
| **Tampering** | N/A — store en memoria, sin persistencia ni sincronización externa que pueda ser alterada por otro actor. |
| **Information Disclosure** | 🔴 Si `MarkerList` o el render Canvas insertaran `label` vía `innerHTML`/`dangerouslySetInnerHTML`, un usuario podría inyectar HTML/script (XSS reflejado en la propia sesión — self-XSS, sin servidor ni otros usuarios de por medio, pero igual una vulnerabilidad real: CWE-79 / F-SAST-06). React escapa por defecto el contenido de texto (`{label}` en JSX), así que el riesgo existe únicamente si la implementación se desvía de ese patrón. |
| **Denial of Service** | Un número muy grande de marcadores podría degradar el render (relacionado con NFR-02, ya cubierto por la spec: un solo pase de `drawChart`). No es un vector de ataque per se en una app sin límite de uso, sino un riesgo de performance ya mitigado en diseño. |

### 3. Nueva dependencia (`@radix-ui/react-dialog`, `lucide-react`)

| Categoría | Análisis |
|---|---|
| **Supply chain** | Paquetes de terceros ampliamente usados (Radix UI, base de shadcn/ui), mantenidos activamente, sin CVEs críticas conocidas a la fecha. Se instalan con versiones fijadas en `package-lock.json` (ya committeado en el repo, `AGENTS.md`). |
| Elevation of Privilege | N/A — corren con los mismos privilegios que el resto del bundle del cliente, sin acceso a Node/filesystem (front-end puro). |

## Riesgos identificados

| Riesgo | STRIDE | Likelihood | Impact | Mitigación |
|---|---|---|---|---|
| XSS si `label` se renderiza sin escapar (Canvas o `MarkerList`) | Information Disclosure / Tampering | Low | High | **Mitigación obligatoria, folded into spec**: `MarkerList` y cualquier tooltip/etiqueta dibujada en Canvas deben renderizar `label` como texto plano — en `MarkerList` usando interpolación JSX estándar (`{marker.label}}`, nunca `dangerouslySetInnerHTML`); en Canvas, `label` solo se pinta con `ctx.fillText(...)` (API de texto, no de HTML), que no interpreta marcado. Se agrega como test explícito en Block 6. |
| Etiqueta desproporcionadamente larga degrada UI/render | Denial of Service | Low | Low | Ya mitigado en Block 4 de la spec: `maxLength={200}` en el `<input>`. |
| CVE futura en `@radix-ui/react-dialog`/`lucide-react` | Supply chain | Low | Medium | `package-lock.json` fija versiones exactas; auditoría periódica vía `npm audit` (ya convención del proyecto, `AGENTS.md`/`security.instructions.md` §"Dependency Security"). No se requiere acción adicional en este ticket. |

No hay datos clasificables como PII/credenciales/financieros en el alcance de este ticket (F-TM-05
N/A): la etiqueta es texto libre que el usuario decide escribir, no persiste, no se transmite, y el
propio PRD prohíbe expresamente atribuir a la app carácter de historia clínica o registro de
paciente identificado. F-TM-07 (cifrado) no aplica: no hay datos sensibles clasificados que cifrar en
este ticket.

## Mitigaciones a incorporar en la spec

1. **Block 6 (`MarkerList`)**: agregar un test explícito — "un `label` que contiene marcado HTML
   (p. ej. `<img onerror=...>`) se renderiza como texto literal, no se interpreta como HTML" — y
   documentar en el bloque que el renderizado usa interpolación JSX estándar, nunca
   `dangerouslySetInnerHTML`.
2. **Block 5 (`drawMarkers`)**: documentar explícitamente que cualquier texto de marcador dibujado en
   el Canvas usa `ctx.fillText`, nunca inserción de HTML.

Ambas mitigaciones se pliegan a la spec antes de aprobarla (ver actualización de Block 5/Block 6).
