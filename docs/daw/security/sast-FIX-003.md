# SAST FIX-003: Agrandar tamaño de fuente del tooltip de la Regla

| Field | Value |
|-------|-------|
| Ticket | FIX-003 |
| Date | 2026-08-25 |
| Scope | `src/frontend/src/components/render/drawOverlay.ts`, `drawOverlay.test.ts` |

## Resumen

Cambio de una constante de estilo (`ctx.font`) de `'10px sans-serif'` a `'20px sans-serif'`. Sin
input externo, sin dependencias nuevas, sin cambios en `package.json`/`package-lock.json`.

## Checklist

✅ **F-SAST-01** (secretos): sin patrones de API key/password/token.
✅ **F-SAST-02/03/05/06** (injection/XSS): no aplica — literal de string fijo en el código, sin
texto de usuario.
✅ **F-SAST-04/07/08/09/10/11/12**: no aplica.
✅ **F-SAST-14/15**: no aplica — sin input nuevo, sin manejo de errores nuevo.
✅ **F-SAST-13/16** (dependencias): sin cambios en `package.json`/`package-lock.json`.

## Resultado

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│  Total: 2 archivos limpios, 0 vulnerabilidades                  │
└─────────────────────────────────────────────────────────────┘
```
