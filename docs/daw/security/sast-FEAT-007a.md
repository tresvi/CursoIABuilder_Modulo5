# SAST FEAT-007a: Esqueleto del backend .NET

| Field | Value |
|-------|-------|
| Ticket | FEAT-007a |
| Date | 2026-08-26 |
| Result | PASSED |

## Scope

Archivos nuevos/modificados en los 4 bloques: `src/backend/ECGViewer.Api/*`,
`src/backend/ECGViewer.Tests/*`, `src/backend/global.json`,
`src/frontend/src/lib/api/client.ts` (+test), `src/frontend/src/vite-env.d.ts`,
`src/frontend/src/components/BackendStatus.tsx` (+test), `src/frontend/src/App.tsx` (modificado).

## Secretos (F-SAST-01)
✅ 0 patrones de API key/password/secret/connection string encontrados en el scope.
✅ `.env` está en `.gitignore` (línea 12).

## Injection (F-SAST-02/03/05)
✅ 0 ocurrencias de `eval`, `exec`, `Process.Start`, `ExecuteSql`, `FromSqlRaw` — no aplica todavía
(sin SQL/comandos en este ticket, `/api/health` no acepta input).

## XSS (F-SAST-06)
✅ 0 ocurrencias de `innerHTML`/`dangerouslySetInnerHTML` en `BackendStatus.tsx` ni `lib/api/`.

## CORS (mitigación del threat model)
✅ 0 ocurrencias de `AllowAnyOrigin`/`AllowCredentials` en `Program.cs` — confirma que la política
sigue restringida al origen explícito `http://localhost:5173`, sin regresión introducida en
Bloques 2-4.

## Dependencias (F-SAST-13/16)
✅ `npm audit --omit=dev`: 0 vulnerabilidades.
✅ `dotnet list package --vulnerable` (ambos proyectos): sin paquetes vulnerables conocidos.

## Suppressions
Ninguna — no hubo hallazgos Medium/Critical/High que suprimir.

---

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Secretos:                                                    │
│    ✅ F-SAST-01: 0 secretos hardcodeados; .env en .gitignore  │
│                                                              │
│  Injection:                                                   │
│    ✅ F-SAST-02/03/05: sin patrones de inyección (sin SQL/    │
│       comandos/paths con input de usuario en este ticket)      │
│                                                              │
│  XSS y funciones inseguras:                                   │
│    ✅ F-SAST-06: 0 innerHTML/dangerouslySetInnerHTML           │
│                                                              │
│  Dependencias:                                                 │
│    ✅ F-SAST-13/16: npm audit 0 vulns; dotnet sin paquetes      │
│       vulnerables                                               │
│                                                              │
│  Suppressions: 0                                                │
│                                                              │
│  ────────────────────────────────────────────────────────────│
│  Total: 8 clean, 0 vulnerabilidades (0 critical, 0 high)        │
│  Report: docs/daw/security/sast-FEAT-007a.md                    │
│  Next: transicionar a VERIFY                                    │
└─────────────────────────────────────────────────────────────┘
```
