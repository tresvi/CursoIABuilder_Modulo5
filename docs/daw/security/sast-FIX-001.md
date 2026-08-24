# SAST FIX-001: Cursores custom para Regla y Recorte

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Date | 2026-08-24 |
| Scope | `src/frontend/src/components/ECGChart.tsx`, `ECGChart.test.tsx` |

## Resumen

Cambio de una línea: extensión de una expresión `cn(...)` para aplicar una clase Tailwind estática
(`cursor-crosshair`) según el valor de un enum ya validado por TypeScript (`activeTool`). Sin input
externo, sin dependencias nuevas, sin cambios en `package.json`/`package-lock.json`.

## Checklist

✅ **F-SAST-01** (secretos): sin patrones de API key/password/token en los archivos tocados.
✅ **F-SAST-02/03/05** (injection): no aplica — sin queries, sin exec, sin paths de archivo.
✅ **F-SAST-06** (XSS): no aplica — sin `innerHTML`, sin texto de usuario, el valor de `className` es
un literal de código fuente, nunca interpolación de datos externos.
✅ **F-SAST-04/08**: no aplica — sin `eval`, sin criptografía.
✅ **F-SAST-07/09/10/11/12**: no aplica — sin red, sin debug mode, sin logging de datos, sin upload,
sin formularios.
✅ **F-SAST-14/15**: no aplica — sin input nuevo, sin manejo de errores nuevo (el enum ya es cerrado
por TypeScript).
✅ **F-SAST-13/16** (dependencias): `npm audit` sin cambios respecto al último resultado de
FEAT-006 (0 vulnerabilidades) — este fix no modifica ninguna dependencia.

## Resultado

```
┌─────────────────────────────────────────────────────────────┐
│  /daw-security-sast — PASSED                                  │
├─────────────────────────────────────────────────────────────┤
│  Total: 2 archivos limpios, 0 vulnerabilidades                  │
└─────────────────────────────────────────────────────────────┘
```
