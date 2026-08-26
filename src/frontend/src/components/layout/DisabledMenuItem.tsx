interface DisabledMenuItemProps {
  /** Texto visible del ítem, que además es su nombre accesible. */
  label: string;
}

/**
 * Ítem de menú visible pero no disponible (FEAT-009, FR-08/AC-08). `<button>` nativo
 * con `disabled` + `aria-disabled` y estilo atenuado.
 *
 * No recibe ni define `onClick` a propósito: el `disabled` ya impide la activación en
 * el navegador, y la ausencia de handler garantiza que no exista acción alguna que
 * disparar aunque ese atributo se perdiera (mitigación R-04 del threat model).
 */
export function DisabledMenuItem({ label }: DisabledMenuItemProps) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="No disponible todavía"
      className="cursor-not-allowed rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-left text-sm font-medium text-slate-400 opacity-60"
    >
      {label}
    </button>
  );
}
