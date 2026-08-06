# ADR-001: Manejo de estado global de la señal con Zustand

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Ticket | FEAT-001 |
| Status | Accepted |

## Context

ECGViewer necesita, desde su primera feature (RF-01, carga de señal CSV), un lugar donde vivir la
señal cargada en memoria para que otros componentes la consuman (RF-02 la graficará, RF-10 la
filtrará, RF-14 calculará métricas, etc.). El stack declarado en `AGENTS.md` no fija una solución de
manejo de estado, por lo que esta decisión sienta precedente para toda la app. Como este ticket
bootstrapea el proyecto front desde cero, se define acá y no más adelante bajo presión.

## Options considered

### Option 1: React Context + useReducer (nativo, sin dependencia)
- **Pros:** cero dependencias nuevas; alineado con la regla de AGENTS.md de no agregar librerías sin
  justificarlas; suficiente para una única señal.
- **Cons:** re-renders amplios si el árbol crece (todo consumidor del contexto se re-renderiza ante
  cualquier cambio, salvo memoización manual); más boilerplate (provider + reducer + acciones) a
  medida que se agregan filtros, marcadores y recortes; selección granular de estado no es natural.

### Option 2: Zustand (store liviano)
- **Pros:** API mínima, sin provider en el árbol; suscripción selectiva por *selector* (evita
  re-renders innecesarios), lo que importa dado el objetivo de rendimiento del gráfico (RNF-01/02);
  escala bien cuando se sumen filtros/marcadores/recortes; ~1 KB, mantenida y muy usada.
- **Cons:** dependencia nueva de terceros (superficie de cadena de suministro, mitigada con pin de
  versión + `npm audit`); introduce una carpeta `src/state/` no contemplada en la estructura de
  AGENTS.md.

### Option 3: Redux Toolkit
- **Pros:** estándar maduro, devtools potentes.
- **Cons:** boilerplate y peso desproporcionados para una sola señal en memoria; sobreingeniería
  para el alcance actual.

## Decision

Se adopta **Zustand** como solución de estado global, con el store en `src/state/signalStore.ts`.
Motivos concretos: (1) la suscripción por selector minimiza re-renders, coherente con los umbrales
de rendimiento del gráfico; (2) mucho menos boilerplate que Context+reducer o Redux a medida que
crezcan las features de edición de señal; (3) peso despreciable. Se descarta Redux por
sobredimensionado y Context por escalar peor ante la evolución prevista del producto. Decisión
tomada por el usuario (raul) durante PLAN de FEAT-001.

## Consequences

- Se agrega la dependencia `zustand` a `src/frontend/package.json` (versión fijada); queda
  justificada aquí conforme a la regla de dependencias de AGENTS.md.
- Se introduce la carpeta `src/frontend/src/state/` como ubicación convencional de los stores;
  nuevo patrón del proyecto a respetar en features futuras.
- El estado es **volátil**: no persiste (RF-15 fuera de alcance). La persistencia a SQLite, cuando
  llegue, se conectará al store sin cambiar esta decisión.
- Trade-off aceptado: una dependencia de terceros más, a cambio de menor boilerplate y mejor control
  de re-renders.
