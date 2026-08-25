import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSignalStore } from '@/state/signalStore';
import { computeSampleRateHz } from '@/lib/ecg/sampleRate';
import type { FilterType, FilterParams } from '@/lib/api/filters';

/** Opciones del combo, en el mismo orden que la unión `FilterType` (AC-01). */
const FILTER_OPTIONS: Array<{ value: FilterType; label: string }> = [
  { value: 'LowPass', label: 'Pasa Bajo' },
  { value: 'HighPass', label: 'Pasa Alto' },
  { value: 'BandPass', label: 'Pasa Banda' },
  { value: 'Notch', label: 'Notch' },
  { value: 'MovingAverage', label: 'Media Móvil' },
  { value: 'MovingMedian', label: 'Mediana Móvil' },
  { value: 'SavitzkyGolay', label: 'Savitzky-Golay' },
];

/** Defaults del PRD por tipo de filtro; Savitzky-Golay no tiene default (queda vacío). */
const DEFAULTS: Record<FilterType, FilterParams> = {
  LowPass: { cutoff: 49.5 },
  HighPass: { cutoff: 1 },
  BandPass: { cutoffLow: 1, cutoffHigh: 49.5 },
  Notch: { cutoffLow: 50, cutoffHigh: 60 },
  MovingAverage: { window: 5 },
  MovingMedian: { window: 7 },
  SavitzkyGolay: {},
};

/** Campos de texto libre del formulario, todos opcionales mientras se editan. */
type FieldState = {
  cutoff: string;
  cutoffLow: string;
  cutoffHigh: string;
  window: string;
  polynomialDegree: string;
};

function defaultsToFieldState(defaults: FilterParams): FieldState {
  return {
    cutoff: defaults.cutoff !== undefined ? String(defaults.cutoff) : '',
    cutoffLow: defaults.cutoffLow !== undefined ? String(defaults.cutoffLow) : '',
    cutoffHigh: defaults.cutoffHigh !== undefined ? String(defaults.cutoffHigh) : '',
    window: defaults.window !== undefined ? String(defaults.window) : '',
    polynomialDegree:
      defaults.polynomialDegree !== undefined ? String(defaults.polynomialDegree) : '',
  };
}

/** Parsea un campo de texto a número, o `null` si está vacío/no es numérico. */
function parseNumberField(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * Resultado de validar el formulario actual: si es válido, los `params` listos para
 * `applyFilter`; si no, un mensaje de error para mostrar (feedback de UX, no
 * autoritativo — el backend revalida, ver spec Bloque 7).
 */
type ValidationResult = { valid: true; params: FilterParams } | { valid: false; message: string };

function validate(filterType: FilterType, fields: FieldState, nyquistHz: number | null): ValidationResult {
  const isFrequencyType =
    filterType === 'LowPass' ||
    filterType === 'HighPass' ||
    filterType === 'BandPass' ||
    filterType === 'Notch';
  const isSingleCutoff = filterType === 'LowPass' || filterType === 'HighPass';
  const isRangeCutoff = filterType === 'BandPass' || filterType === 'Notch';
  const isWindowType =
    filterType === 'MovingAverage' || filterType === 'MovingMedian' || filterType === 'SavitzkyGolay';

  if (isFrequencyType && nyquistHz === null) {
    return { valid: false, message: 'No se pudo calcular la frecuencia de muestreo.' };
  }

  if (isSingleCutoff) {
    const cutoff = parseNumberField(fields.cutoff);
    if (cutoff === null || cutoff <= 0) {
      return { valid: false, message: 'Ingrese una frecuencia de corte válida.' };
    }
    if (nyquistHz !== null && cutoff > nyquistHz) {
      return {
        valid: false,
        message: `La frecuencia debe ser menor o igual a la frecuencia de Nyquist (${nyquistHz.toFixed(1)} Hz).`,
      };
    }
    return { valid: true, params: { cutoff } };
  }

  if (isRangeCutoff) {
    const low = parseNumberField(fields.cutoffLow);
    const high = parseNumberField(fields.cutoffHigh);
    if (low === null || high === null || low <= 0 || high <= 0) {
      return { valid: false, message: 'Ingrese frecuencias de corte válidas.' };
    }
    if (nyquistHz !== null && (low > nyquistHz || high > nyquistHz)) {
      return {
        valid: false,
        message: `Las frecuencias deben ser menores o iguales a la frecuencia de Nyquist (${nyquistHz.toFixed(1)} Hz).`,
      };
    }
    if (low >= high) {
      return { valid: false, message: 'La frecuencia baja debe ser menor que la alta.' };
    }
    return { valid: true, params: { cutoffLow: low, cutoffHigh: high } };
  }

  if (isWindowType) {
    const window = parseNumberField(fields.window);
    if (window === null || !Number.isInteger(window) || window <= 0) {
      return { valid: false, message: 'Ingrese una ventana entera positiva.' };
    }
    if (filterType === 'SavitzkyGolay') {
      const degree = parseNumberField(fields.polynomialDegree);
      if (degree === null || !Number.isInteger(degree) || degree <= 0) {
        return { valid: false, message: 'Ingrese un grado de polinomio entero positivo.' };
      }
      if (degree >= window) {
        return { valid: false, message: 'El grado del polinomio debe ser menor que la ventana.' };
      }
      return { valid: true, params: { window, polynomialDegree: degree } };
    }
    return { valid: true, params: { window } };
  }

  return { valid: false, message: 'Tipo de filtro desconocido.' };
}

/**
 * Panel de filtros DSP (FEAT-007b, Block 7): combo nativo con los 7 tipos, campos
 * numéricos dinámicos con los defaults del PRD, validación client-side (UX, no
 * autoritativa) y botones "Aplicar filtro"/"Revertir" contra `signalStore`
 * (Block 6). Sigue el patrón de `select`/`input` nativos con `aria-label` de
 * `ChartToolbar`/`CsvUpload`.
 */
export function FilterPanel() {
  const signal = useSignalStore((s) => s.signal);
  const previousSignal = useSignalStore((s) => s.previousSignal);
  const applyFilterAction = useSignalStore((s) => s.applyFilter);
  const revertLastFilter = useSignalStore((s) => s.revertLastFilter);

  const [filterType, setFilterType] = useState<FilterType>('LowPass');
  const [fields, setFields] = useState<FieldState>(() => defaultsToFieldState(DEFAULTS.LowPass));
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const nyquistHz = useMemo(() => {
    if (!signal || signal.samples.length < 2) return null;
    return computeSampleRateHz(signal) / 2;
  }, [signal]);

  const validation = validate(filterType, fields, nyquistHz);

  const hasSignal = signal !== null;
  const canApply = hasSignal && !isApplying && validation.valid;
  const canRevert = hasSignal && previousSignal !== null;

  const handleFilterTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value as FilterType;
    setFilterType(nextType);
    setFields(defaultsToFieldState(DEFAULTS[nextType]));
    setApplyError(null);
  };

  const handleFieldChange = (field: keyof FieldState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [field]: event.target.value }));
    setApplyError(null);
  };

  const handleApply = async () => {
    if (!validation.valid) return;
    setIsApplying(true);
    setApplyError(null);
    const result = await applyFilterAction(filterType, validation.params);
    setIsApplying(false);
    if (!result.ok) {
      setApplyError(result.error ?? 'No se pudo aplicar el filtro.');
    }
  };

  const handleRevert = () => {
    revertLastFilter();
    setApplyError(null);
  };

  const isSingleCutoff = filterType === 'LowPass' || filterType === 'HighPass';
  const isRangeCutoff = filterType === 'BandPass' || filterType === 'Notch';
  const isSimpleWindow = filterType === 'MovingAverage' || filterType === 'MovingMedian';
  const isSavitzkyGolay = filterType === 'SavitzkyGolay';

  return (
    <section
      aria-label="Panel de filtros"
      className="mx-auto flex max-w-3xl flex-col gap-3 rounded-md border border-slate-300 bg-white p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Tipo de filtro"
          value={filterType}
          disabled={!hasSignal}
          onChange={handleFilterTypeChange}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {isSingleCutoff && (
          <input
            type="number"
            step="0.1"
            min="0"
            aria-label="Frecuencia de corte (Hz)"
            value={fields.cutoff}
            disabled={!hasSignal}
            onChange={handleFieldChange('cutoff')}
            className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        )}

        {isRangeCutoff && (
          <>
            <input
              type="number"
              step="0.1"
              min="0"
              aria-label="Frecuencia de corte baja (Hz)"
              value={fields.cutoffLow}
              disabled={!hasSignal}
              onChange={handleFieldChange('cutoffLow')}
              className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.1"
              min="0"
              aria-label="Frecuencia de corte alta (Hz)"
              value={fields.cutoffHigh}
              disabled={!hasSignal}
              onChange={handleFieldChange('cutoffHigh')}
              className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </>
        )}

        {(isSimpleWindow || isSavitzkyGolay) && (
          <input
            type="number"
            step="1"
            min="1"
            aria-label="Ventana"
            value={fields.window}
            disabled={!hasSignal}
            onChange={handleFieldChange('window')}
            className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        )}

        {isSavitzkyGolay && (
          <input
            type="number"
            step="1"
            min="1"
            aria-label="Grado de polinomio"
            value={fields.polynomialDegree}
            disabled={!hasSignal}
            onChange={handleFieldChange('polynomialDegree')}
            className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        )}

        <button
          type="button"
          aria-label="Aplicar filtro"
          disabled={!canApply}
          onClick={() => void handleApply()}
          className={cn(
            'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
            canApply
              ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700'
              : 'border-slate-300 bg-slate-100 text-slate-400',
          )}
        >
          Aplicar filtro
        </button>

        <button
          type="button"
          aria-label="Revertir"
          disabled={!canRevert}
          onClick={handleRevert}
          className={cn(
            'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
            canRevert
              ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              : 'border-slate-300 bg-slate-100 text-slate-400',
          )}
        >
          Revertir
        </button>
      </div>

      {hasSignal && !validation.valid && (
        <p className="text-sm font-medium text-amber-700">{validation.message}</p>
      )}

      {applyError && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800"
        >
          {applyError}
        </p>
      )}
    </section>
  );
}
