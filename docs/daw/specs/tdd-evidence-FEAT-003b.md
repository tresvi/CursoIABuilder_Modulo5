# Evidencia TDD FEAT-003b

| Field | Value |
|-------|-------|
| Ticket | FEAT-003b |
| Spec | docs/daw/specs/spec-FEAT-003b.md |
| Regla | `.daw/rules/testing.instructions.md`, Rule #-1 ("Test first, always") |

Cada bloque se implementó con `daw-implementer`, que reporta qué tests fallaban ANTES de escribir el
código de producción y con qué aserción, y confirma que pasan DESPUÉS. Este documento persiste esa
evidencia (capturada en los reportes de cada agente durante CODE) en el repo.

## Block 1 — `markersStore`: `formState` + `updateMarker`/`removeMarker`

- **Failing before**: 7/7 — cada test fallaba con `TypeError: <acción> is not a function`
  (`updateMarker`, `removeMarker`, `openCreateForm` no existían todavía en el store).
- **Passing after**: 13/13 en `markersStore.test.ts` (6 preexistentes de FEAT-003a + 7 nuevos).

## Block 2 — `MarkerForm`: modo `create`/`edit`, autosuficiente

- **Failing before**: 11/12 — los tests que dependían del nuevo contrato sin props fallaban
  (`TestingLibraryElementError` al buscar el campo de tiempo/etiqueta, porque el componente viejo
  exigía props que ya no se le pasaban; el auto-cierre fallaba con `AssertionError: expected {...}
  to be null` porque no existía el `useEffect` correspondiente). El único test que pasaba de entrada
  era el trivial "con formState null, el diálogo no se muestra" (por eso 11/12 y no 12/12).
- **Passing after**: 12/12 en `MarkerForm.test.tsx`.

## Block 3 — `ECGChart`: usar las acciones del store en vez de estado local

- **Failing before**: 2/2 — el test de AC-02 (reescrito) fallaba con
  `TestingLibraryElementError: Unable to find role "dialog"` (con el código viejo, `formState` del
  store se mantenía `null` tras el `mouseup`, porque `ECGChart` seguía usando su `useState` local);
  el de AC-03 fallaba con `AssertionError: expected null not to be null` / `expected undefined to be
  'create'`.
- **Passing after**: 15/15 en `ECGChart.test.tsx`; 114/114 en la suite completa del frontend en ese
  momento.

## Block 4 — `MarkerList`: botones "Editar"/"Eliminar" + `ConfirmDialog`

- **Failing before**: 8/8 — los 3 tests de `ConfirmDialog.test.tsx` fallaban al no resolver el
  import (`Failed to resolve import './ConfirmDialog'`, el archivo no existía); los 5 tests nuevos
  de `MarkerList.test.tsx` (AC-01, AC-04, AC-05, AC-06 + el de XSS) fallaban con
  `TestingLibraryElementError: Unable to find an accessible element with the role 'button' and name
  /editar|eliminar/i` (los botones no existían todavía en cada ítem).
- **Passing after**: 11/11 (`MarkerList.test.tsx` + `ConfirmDialog.test.tsx`); 121/121 en la suite
  completa.
- **Corrección adicional en este bloque**: se detectó y corrigió un error de lint preexistente en
  `MarkerForm.tsx` (Block 2) — un comentario `eslint-disable-next-line react-hooks/exhaustive-deps`
  referenciaba una regla de un plugin que el proyecto nunca tuvo instalado/configurado
  (`eslint.config.js` solo carga `@eslint/js` + `typescript-eslint`), lo que hacía fallar
  `npm run lint` con "Definition for rule ... was not found". Se eliminó el comentario (la regla
  nunca estuvo activa, no suprimía nada real) — confirmado en la revisión de Block 4 que no oculta
  ningún problema genuino de dependencias del `useEffect`.

## Block 5 — `App.tsx`: montar `MarkerForm` autosuficiente

- **Failing before**: 1/2 tests nuevos — "con formState abierto en el store, App renderiza el
  diálogo de MarkerForm" fallaba con `screen.getByRole('dialog')` sin encontrar ningún elemento
  (`MarkerForm` no estaba montado en `App.tsx`). El otro test nuevo ("sin formState abierto, el
  diálogo no se muestra") pasaba trivialmente desde el inicio por ser una aserción negativa sobre un
  estado ya por defecto — se incluye como caso de regresión complementario, no como evidencia TDD por
  sí solo.
- **Passing after**: 3/3 en `App.test.tsx`; 123/123 en la suite completa del frontend (cierre del
  ticket).

## Resumen

| Block | Tests nuevos | Failing before | Passing after | TDD estricto |
|---|---|---|---|---|
| 1 | 7 | 7/7 | 13/13 | Sí |
| 2 | 12 | 11/12 | 12/12 | Sí (11/12; el único ya-verde era trivial) |
| 3 | 2 | 2/2 | 15/15 | Sí |
| 4 | 8 | 8/8 | 11/11 | Sí |
| 5 | 2 | 1/2 | 3/3 | Sí (1/2; el otro era regresión trivial) |

Todos los bloques de FEAT-003b tienen evidencia roja→verde genuina y verificable (mensaje de error
o conteo exacto reportado por el `daw-implementer` de cada bloque), sin excepciones "parciales" como
las que hubo en FEAT-003a (acá no se agregaron tests post-hoc sobre código ya correcto).
