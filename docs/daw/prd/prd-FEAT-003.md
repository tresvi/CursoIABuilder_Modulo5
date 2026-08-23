# Parent PRD: Marcadores de evento sobre el gráfico ECG (RF-03/04/05)

| Metric | Value |
|--------|-------|
| Ticket | FEAT-003 |
| Date | 2026-08-14 |
| Status | Split |

## Sub-tickets

| Sub-ticket | Title | PRD | Dependencies | Status |
|---|---|---|---|---|
| FEAT-003a | Crear y listar marcadores de evento (RF-03) | prd-FEAT-003a.md | none | active |
| FEAT-003b | Editar y eliminar marcadores de evento (RF-04/05) | prd-FEAT-003b.md | depends on a | pending |

## Suggested implementation order
a → b

## Original context

Los usuarios de ECGViewer necesitan anotar sobre la señal ECG puntos de interés (artefactos,
arritmias, anomalías) para su análisis posterior. El ticket original agrupaba crear, listar, editar
y eliminar marcadores (RF-03/04/05) en un único PRD de 9 FR / 8 AC — por encima del umbral guía de
5-7 AC. Se decidió dividir en dos sub-tickets: **FEAT-003a** (crear + listar, la base sin la cual
editar/eliminar no tiene sentido) y **FEAT-003b** (editar + eliminar, que depende de la lista y del
formulario compartido que introduce 003a).
