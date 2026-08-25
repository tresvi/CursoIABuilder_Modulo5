# Parent PRD: Backend .NET + filtros DSP (pasa bajo/alto/banda/notch) + revertir a original (RF-10/RF-11)

| Metric | Value |
|--------|-------|
| Ticket | FEAT-007 |
| Date | 2026-08-25 |
| Status | Split |

## Sub-tickets

| Sub-ticket | Title | PRD | Dependencies | Status |
|---|---|---|---|---|
| FEAT-007a | Esqueleto del backend .NET | prd-FEAT-007a.md | none | done — PR #12 mergeado a main (49d2672) |
| FEAT-007b | Filtros DSP (RF-10/RF-11) | prd-FEAT-007b.md | depends on a | active |

## Suggested implementation order
a → b

## Original context

El usuario pidió avanzar con la creación del backend (.NET) para poder implementar los filtros DSP
(RF-10: aplicar filtro pasa bajo/alto/banda/notch a la señal; RF-11: revertir un filtro aplicado a la
señal previa). Al conversar los requisitos surgió que:

- El backend no existe todavía en el repo (ni `.sln` ni `.csproj`), pese a estar documentado en
  `AGENTS.md` (ASP.NET Core Minimal API, .NET 10, FftSharp, ClosedXML, SQLite) — hay que crearlo
  desde cero.
- El catálogo real de filtros es más amplio que "pasa bajo/alto/banda/notch": son 7 tipos (Pasa
  Bajo, Pasa Alto, Pasa Banda, Notch, Media Móvil, Mediana Móvil, Savitzky-Golay), con validaciones
  de parámetros (Nyquist, relación corte-inferior/corte-superior, ventana entera positiva, grado de
  polinomio < ventana) y un modelo de aplicación encadenada/aditiva con un único nivel de undo
  ("Revertir" deshace solo el último filtro aplicado; volver a la señal original requiere
  recargar el archivo — decisión intencional del usuario).

Por tamaño (~12-14 ACs estimados, dos módulos claramente separables: infraestructura de backend vs.
lógica de filtros) se dividió en dos sub-tickets independientemente entregables.
