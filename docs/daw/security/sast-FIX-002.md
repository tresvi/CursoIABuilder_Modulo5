# SAST FIX-002: Regla — limpiar overlay en cada arrastre + selección rectangular

| Field | Value |
|-------|-------|
| Ticket | FIX-002 |
| Date | 2026-08-25 |
| Scope | `src/frontend/src/components/render/drawOverlay.ts`, `drawOverlay.test.ts` |

## Resumen

Cambio contenido en una función de dibujo: se agrega un `clearOverlay` inicial y se reemplaza un
`moveTo/lineTo/stroke` por `fillRect/strokeRect` entre coordenadas ya calculadas por el caller. Sin
input externo nuevo, sin dependencias nuevas, sin cambios en `package.json`/`package-lock.json`.

## Checklist

✅ **F-SAST-01** (secretos): sin patrones de API key/password/token en los archivos tocados.
✅ **F-SAST-02/03/05** (injection): no aplica — sin queries, sin exec, sin paths de archivo.
✅ **F-SAST-06** (XSS): no aplica — sin `innerHTML`, sin texto de usuario; el tooltip sigue
pintándose vía `ctx.fillText` con valores numéricos calculados, sin cambios en esa parte.
✅ **F-SAST-04/08**: no aplica — sin `eval`, sin criptografía.
✅ **F-SAST-07/09/10/11/12**: no aplica — sin red, sin debug mode, sin logging de datos, sin
upload, sin formularios.
✅ **F-SAST-14/15**: no aplica — sin input nuevo; `drawRuler` sigue siendo una función de dibujo
pura sin validación de rango (documentado desde FEAT-004, sin cambios).
✅ **F-SAST-13/16** (dependencias): sin cambios en `package.json`/`package-lock.json` — mismo
resultado de `npm audit` que FIX-001/FEAT-006 (0 vulnerabilidades).

## Resultado

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│  Total: 2 archivos limpios, 0 vulnerabilidades                  │
└─────────────────────────────────────────────────────────────┘
```
