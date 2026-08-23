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

const LABEL_MAX_LENGTH = 200;

export interface MarkerFormProps {
  open: boolean;
  time: number | null;
  onConfirm: (label: string | null) => void;
  onCancel: () => void;
}

/**
 * Diálogo de creación de marcador (FEAT-003a, Block 4). El tiempo se fija por el
 * caller (clic sobre el gráfico, Block 5) y se muestra de solo lectura (AC-02); la
 * etiqueta es texto libre vía `<input>` nativo (no Radix, per AGENTS.md).
 */
export function MarkerForm({ open, time, onConfirm, onCancel }: MarkerFormProps) {
  const [label, setLabel] = useState('');
  const timeFieldId = useId();
  const labelFieldId = useId();

  // Limpia la etiqueta cada vez que se abre el diálogo para un nuevo marcador.
  useEffect(() => {
    if (open) setLabel('');
  }, [open]);

  const handleConfirm = () => {
    const trimmed = label.trim();
    onConfirm(trimmed === '' ? null : trimmed);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo marcador</DialogTitle>
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
            onClick={onCancel}
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
