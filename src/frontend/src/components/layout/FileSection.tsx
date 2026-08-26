import { CsvUpload } from '@/components/CsvUpload';
import { ExampleLoader } from '@/components/ExampleLoader';
import { DisabledMenuItem } from './DisabledMenuItem';

/**
 * Contenido de la sección "Archivo" del sidebar (FEAT-009, Block 4). Reproduce el
 * orden de `docs/UI/UI_Without_any_ECG_Loaded.PNG`: Abrir CSV, Cargar ejemplo,
 * Importar XLSX, Guardar, Guardar como CSV, Exportar XLSX.
 *
 * "Abrir CSV" monta el `CsvUpload` existente sin tocar su lógica (validación de
 * tamaño, parseo y mensajes de error siguen siendo suyos, ahora dentro de esta
 * sección). Los cuatro ítems de RF-12/13/15 se muestran deshabilitados (FR-08).
 *
 * El rótulo "Abrir CSV" es un `<p>`, no un encabezado: el outline del documento va
 * h1 "ECGViewer" (`Sidebar`) → h2 "Trazado ECG" (`TopBar`), y un h3 aquí saltaría un
 * nivel (heading-order de axe, WCAG 1.3.1). El input tiene su propio nombre accesible
 * (`aria-label` en `CsvUpload`), así que no pierde etiqueta.
 */
export function FileSection() {
  return (
    <section aria-label="Archivo" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-200">Abrir CSV</p>
        <CsvUpload />
      </div>

      {/* "Cargar ejemplo" (FR-07): entre "Abrir CSV" e "Importar XLSX", según el
          orden de `docs/UI/UI_Without_any_ECG_Loaded.PNG`. Va con `showError={false}`
          porque en esta sección el dueño del mensaje de error es `CsvUpload` (Block 4,
          "Error handling"): si ambos lo renderizaran, un fallo al traer un ejemplo
          mostraría dos `role="alert"` idénticos y el lector de pantalla lo anunciaría
          dos veces. */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-200">Cargar ejemplo</p>
        <ExampleLoader showError={false} />
      </div>

      <div className="flex flex-col gap-2">
        <DisabledMenuItem label="Importar XLSX" />
        <DisabledMenuItem label="Guardar" />
        <DisabledMenuItem label="Guardar como CSV" />
        <DisabledMenuItem label="Exportar XLSX" />
      </div>
    </section>
  );
}
