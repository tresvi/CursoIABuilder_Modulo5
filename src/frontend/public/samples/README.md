# Señales ECG de ejemplo (copia servible por Vite)

Esta carpeta contiene los 3 CSV de ejemplo que la aplicación ofrece en "Cargar ejemplo"
(FEAT-009, FR-07). Vite solo sirve como assets estáticos lo que está bajo `public/`, así
que los archivos viven acá para poder pedirlos con `GET /samples/<archivo>.csv`.

## Fuente de verdad

La **fuente de verdad** de estos archivos es `ECGSamples/CSV/` en la raíz del repositorio.
Esta carpeta es una **copia versionada** de aquella, no un original.

Por eso, ante cualquier cambio (regenerar una señal, agregar o quitar un ejemplo):

1. Modificá primero el archivo en `ECGSamples/CSV/`.
2. Recién después re-copiá el archivo acá:

   ```bash
   cp ECGSamples/CSV/<archivo>.csv src/frontend/public/samples/<archivo>.csv
   ```

3. Si cambia el conjunto de ejemplos, actualizá también el catálogo
   `src/frontend/src/lib/ecg/samples.ts` (lista blanca de ids y rutas literales).

La copia **no** está automatizada con un script de build a propósito: agregar un paso de
build nuevo iría contra NFR-02 de FEAT-009 (sin dependencias ni pasos extra).

## Archivos

| Archivo                      | Origen                                      |
| ---------------------------- | ------------------------------------------- |
| `ECG_20_Seg_FILTRADO.csv`    | `ECGSamples/CSV/ECG_20_Seg_FILTRADO.csv`    |
| `ECG_20_Seg_NO_FILTRADO.csv` | `ECGSamples/CSV/ECG_20_Seg_NO_FILTRADO.csv` |
| `ECG_20_Seg_ESPANTOSO.csv`   | `ECGSamples/CSV/ECG_20_Seg_ESPANTOSO.csv`   |

Cada archivo debe pesar **≤ 260 KB** (NFR-03): hay un test de guarda
(`src/frontend/src/lib/ecg/samples.test.ts`) que falla si alguno supera ese presupuesto.
