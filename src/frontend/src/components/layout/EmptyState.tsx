import { ExampleLoader } from '@/components/ExampleLoader';

/**
 * Estado vacío del panel principal (FEAT-009, Block 6 — FR-05): mensaje de
 * instrucción centrado y el control "Cargar ejemplo" destacado como call-to-action,
 * reproduciendo `docs/UI/UI_Without_any_ECG_Loaded.PNG`.
 *
 * Se muestra siempre que no haya señal cargada, incluido el caso posterior a un error
 * (`setError` deja `signal` en `null`): nunca queda un panel vacío sin explicación.
 */
export function EmptyState() {
  return (
    <section
      aria-label="Sin señal cargada"
      className="flex min-h-96 flex-col items-center justify-center gap-5 rounded-lg border border-dashed border-slate-300 bg-white/60 p-8 text-center"
    >
      <p className="max-w-md text-base text-slate-500">
        Cargá un archivo CSV de ECG monocanal (columnas tiempo, valor) para comenzar, o bien elegí
        cargar un ejemplo.
      </p>

      {/* `showError={false}` a propósito: `CsvUpload` está siempre montado en el
          sidebar y renderiza el error del store de forma incondicional. Si el estado
          vacío también lo renderizara, un fallo al traer un ejemplo mostraría dos
          `role="alert"` con texto idéntico y, como `role="alert"` es
          `aria-live="assertive"`, el lector de pantalla anunciaría el mismo mensaje dos
          veces interrumpiéndose. El dueño del mensaje es uno solo: el del sidebar.
          La prop es requerida (sin default) para que omitirla no compile. */}
      {/* Rótulo visible del call-to-action, como en la referencia. Es un `<p>`, no un
          encabezado, siguiendo el mismo patrón que `FileSection`: el outline del
          documento va h1 "ECGViewer" (`Sidebar`) → h2 "Trazado ECG" (`TopBar`), y un h3
          acá saltaría un nivel (heading-order de axe, WCAG 1.3.1). */}
      <div className="flex w-full max-w-xs flex-col gap-2">
        <p className="text-sm font-medium text-slate-600">Cargar ejemplo</p>
        <ExampleLoader showError={false} />
      </div>
    </section>
  );
}
