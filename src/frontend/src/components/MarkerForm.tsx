import { useEffect, useId, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMarkerTime } from '@/lib/ecg/chart/format';
import { useMarkersStore } from '@/state/markersStore';

const LABEL_MAX_LENGTH = 200;

/**
 * Formulario de creación/edición de marcador (FEAT-003a Block 4, autosuficiente desde
 * FEAT-003b Block 2). No recibe props: lee `formState`/`markers` de `markersStore` y
 * llama directamente a `addMarker`/`updateMarker`/`closeForm`, para que un único
 * `<MarkerForm />` (montado en `App.tsx`, Block 5) sirva tanto al flujo de creación
 * (disparado desde `ECGChart`) como al de edición (disparado desde `MarkerList`).
 */
export function MarkerForm() {
  const formState = useMarkersStore((s) => s.formState);
  const markers = useMarkersStore((s) => s.markers);

  const open = formState !== null;
  const editedMarker =
    formState?.mode === 'edit' ? markers.find((m) => m.id === formState.markerId) : undefined;
  // En modo edit con un id que ya no existe (marcador eliminado mientras el form estaba
  // abierto), no hay datos válidos que mostrar: el useEffect de abajo cierra el form.
  const editMissing = formState?.mode === 'edit' && editedMarker === undefined;

  const time = formState?.mode === 'create' ? formState.time : (editedMarker?.time ?? null);
  const initialLabel = formState?.mode === 'edit' ? (editedMarker?.label ?? '') : '';
  const title = formState?.mode === 'edit' ? 'Editar marcador' : 'Nuevo marcador';

  const [label, setLabel] = useState('');
  const timeFieldId = useId();
  const labelFieldId = useId();

  // Reinicializa la etiqueta al valor prellenado (vacío en modo create, el actual en
  // modo edit) cada vez que el form pasa de cerrado a abierto.
  useEffect(() => {
    if (open) setLabel(initialLabel);
  }, [open]);

  // Auto-cierre: si estoy editando un marcador que fue eliminado mientras el form
  // estaba abierto, no renderizar con datos inconsistentes.
  useEffect(() => {
    if (editMissing) useMarkersStore.getState().closeForm();
  }, [formState, markers, editMissing]);

  if (editMissing) return null;

  const handleConfirm = () => {
    const trimmed = label.trim();
    const value = trimmed === '' ? null : trimmed;
    if (formState?.mode === 'edit') {
      useMarkersStore.getState().updateMarker(formState.markerId, value);
    } else if (formState?.mode === 'create') {
      useMarkersStore.getState().addMarker(formState.time, value);
    }
    useMarkersStore.getState().closeForm();
  };

  const handleCancel = () => {
    useMarkersStore.getState().closeForm();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) handleCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Confirmá el instante fijado y agregá una etiqueta opcional para el marcador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={timeFieldId} className="text-sm font-medium text-slate-700">
              Tiempo del marcador
            </label>
            <input
              id={timeFieldId}
              type="text"
              aria-label="Tiempo del marcador"
              value={time !== null ? formatMarkerTime(time) : ''}
              readOnly
              className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={labelFieldId} className="text-sm font-medium text-slate-700">
              Etiqueta
            </label>
            <input
              id={labelFieldId}
              type="text"
              aria-label="Etiqueta"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={LABEL_MAX_LENGTH}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md border border-sky-600 bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            Confirmar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
