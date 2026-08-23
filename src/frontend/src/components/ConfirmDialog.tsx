import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación genérico (FEAT-003b, Block 4), sobre el primitivo `Dialog`
 * ya instalado en FEAT-003a. `description` se renderiza vía interpolación JSX estándar
 * (nunca `dangerouslySetInnerHTML`) — mitigación de XSS obligatoria
 * (docs/daw/security/threat-FEAT-003b.md).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

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
            onClick={onConfirm}
            className="rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Confirmar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
