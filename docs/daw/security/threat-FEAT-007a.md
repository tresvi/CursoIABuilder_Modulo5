# Threat Model FEAT-007a: Esqueleto del backend .NET

| Field | Value |
|-------|-------|
| Ticket | FEAT-007a |
| Date | 2026-08-25 |
| Result | PASSED |

## Attack surfaces identificadas

1. **`ECGViewer.Api` (nuevo servicio ASP.NET Core Minimal API)** — primer componente server-side
   del proyecto. Expone `GET /api/health` sin autenticación.
2. **Política CORS** de `ECGViewer.Api` — nueva superficie de configuración que decide qué orígenes
   pueden invocar el backend desde un navegador.
3. **`src/frontend/src/lib/api/client.ts`** — nuevo cliente HTTP que lee `VITE_API_BASE` (variable
   de entorno de build/dev, no controlada por un atacante en runtime) y hace `fetch` hacia el
   backend.
4. **`BackendStatus.tsx`** — consume el resultado del health check y lo renderiza; no acepta input
   de usuario.

## Trust boundaries

- **Navegador (front, `http://localhost:5173`) ↔ `ECGViewer.Api` (`http://localhost:5080`)**: cruce
  de confianza explícito — es exactamente donde la política CORS actúa. Cualquier origen que no sea
  `http://localhost:5173` está del otro lado de este límite.
- **Desarrollador/entorno local ↔ proceso `ECGViewer.Api`**: el servicio corre en `localhost`, sin
  exposición a la red — el límite de confianza real en este ticket es la máquina local, no internet.
  No hay una superficie de despliegue en producción todavía (ver "Out of Scope" del PRD).

## STRIDE por componente

### `GET /api/health`
| Categoría | Evaluación |
|---|---|
| Spoofing | No hay identidad que suplantar — el endpoint no distingue actores. |
| Tampering | Solo lectura (`GET`), sin estado mutable. |
| Repudiation | No hay logging de invocaciones — aceptable: no hay ninguna acción con consecuencias que auditar. |
| Information Disclosure | El cuerpo de respuesta (`{ "status": "ok" }`) no contiene datos sensibles. Riesgo real: la página de excepciones de desarrollo de ASP.NET puede filtrar rutas/stack traces si el entorno se confunde. |
| Denial of Service | Endpoint sin autenticación, invocable repetidamente — mitigado por el alcance (solo entorno de desarrollo local, sin exposición a internet). |
| Elevation of Privilege | No existen niveles de privilegio en este ticket. |

### Política CORS
| Categoría | Evaluación |
|---|---|
| Spoofing/Tampering | Una política mal configurada (`AllowAnyOrigin` + credenciales) permitiría que un sitio malicioso invoque el backend desde el navegador de un usuario. Mitigado por diseño: origen explícito (`http://localhost:5173`), sin comodín. |

### `client.ts` / `VITE_API_BASE`
| Categoría | Evaluación |
|---|---|
| Tampering | La variable de entorno la controla el desarrollador en build/dev, no un atacante en runtime. |
| Information Disclosure | El valor por defecto (`http://localhost:5080`) no es sensible. |

## Clasificación de datos sensibles (F-TM-05)

Ninguno de los componentes de este ticket maneja PII, credenciales ni datos financieros — el único
dato que cruza el límite de confianza es `{ "status": "ok" }` (público, no sensible). No aplica
cifrado en tránsito/reposo (F-TM-07): no hay datos que cifrar todavía.

## Riesgos identificados

| Riesgo | STRIDE | Likelihood | Impact | Mitigación |
|---|---|---|---|---|
| CORS mal configurado (comodín de origen) | Spoofing/Tampering | Low | Medium | Origen explícito `http://localhost:5173` en `Program.cs`, sin `AllowAnyOrigin`, verificado por AC-05. |
| Página de excepciones de desarrollo filtra stack traces | Information Disclosure | Medium | Low | Mantener `UseDeveloperExceptionPage` (comportamiento por defecto de ASP.NET) confinado al entorno `Development`; documentado como pendiente de revisión cuando exista un ticket de despliegue a producción. |
| Endpoint sin autenticación accesible por cualquier proceso en la máquina local | DoS/Elevation of Privilege | Low | Low | 🟢 Riesgo aceptado (ver abajo) — el alcance de este ticket es explícitamente desarrollo local, sin exposición a red (ver "Out of Scope" del PRD). |
| Sin HTTPS en desarrollo local | Tampering/Information Disclosure | Low | Low | 🟢 Riesgo aceptado (ver abajo) — estándar para desarrollo local; a revisar antes de cualquier despliegue real. |

## Riesgos aceptados (F-TM-04)

1. **Endpoint sin autenticación / sin límite de tasa.**
   - Aceptado por: el usuario (raúl), durante la sesión de PLAN de FEAT-007a (2026-08-25).
   - Justificación: el servicio corre exclusivamente en `localhost` para desarrollo; no hay
     exposición a red ni a producción en este ticket (fuera de alcance: "Configuración de CORS para
     producción/despliegue", ver PRD).
   - Condición de revisión: antes de que exista un ticket de despliegue del backend a un entorno
     accesible por red (producción o staging).

2. **Sin HTTPS en desarrollo.**
   - Aceptado por: el usuario (raúl), durante la sesión de PLAN de FEAT-007a (2026-08-25).
   - Justificación: tráfico de loopback en la máquina local; ASP.NET Core en modo desarrollo no
     fuerza HTTPS por defecto y este ticket no define infraestructura de despliegue.
   - Condición de revisión: antes de cualquier despliegue real del backend.

## Mitigaciones a incorporar en la spec

1. La política CORS debe declarar el origen explícitamente (`http://localhost:5173`), nunca un
   comodín — AC-05 del PRD ya lo exige; la spec debe indicar el código concreto en `Program.cs`.
2. El manejo de excepciones debe usar el comportamiento estándar de ASP.NET por entorno
   (`app.Environment.IsDevelopment()` → `UseDeveloperExceptionPage()`), sin forzarlo en todos los
   entornos.

---

```
┌─────────────────────────────────────────────────────────┐
│  /daw-threat-modeling — PASSED                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Attack surfaces identified: 4                           │
│  Trust boundaries declared: 2                            │
│                                                          │
│  Risks:                                                  │
│    🟡 MEDIUM: CORS mal configurado — Mitigation: origen  │
│       explícito, sin comodín (AC-05)                     │
│    🟢 LOW: página de excepciones de dev filtra detalles  │
│       — Mitigation: confinada a entorno Development       │
│    🟢 LOW: sin auth/rate-limit — riesgo aceptado          │
│    🟢 LOW: sin HTTPS en dev — riesgo aceptado             │
│                                                          │
│  Mitigations to fold into the spec:                      │
│    1. CORS con origen explícito en Program.cs             │
│    2. Manejo de excepciones por entorno                   │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│  Risks: C:0 H:0 M:1 L:3                                  │
│  Report: docs/daw/security/threat-FEAT-007a.md            │
└─────────────────────────────────────────────────────────┘
```
