import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BackendStatus } from './BackendStatus';
import { CsvUpload } from './CsvUpload';
import * as client from '@/lib/api/client';

/**
 * Tests de BackendStatus (FEAT-007a, Block 4). Se mockea `checkHealth` del
 * módulo `client.ts` (patrón sugerido por la spec) en vez de mockear `fetch`
 * directamente, ya que este componente no conoce la capa de red.
 */
describe('BackendStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra "Backend: conectado" cuando checkHealth resuelve { ok: true } (AC-02)', async () => {
    vi.spyOn(client, 'checkHealth').mockResolvedValue({ ok: true });

    render(<BackendStatus />);

    await waitFor(() => {
      expect(screen.getByText('Backend: conectado')).toBeInTheDocument();
    });
  });

  it('muestra "Backend: no disponible" cuando checkHealth resuelve { ok: false } (AC-03)', async () => {
    vi.spyOn(client, 'checkHealth').mockResolvedValue({ ok: false });

    render(<BackendStatus />);

    await waitFor(() => {
      expect(screen.getByText('Backend: no disponible')).toBeInTheDocument();
    });
  });

  it('el resto de la app sigue renderizado y funcional aunque checkHealth resuelva { ok: false } (AC-03)', async () => {
    vi.spyOn(client, 'checkHealth').mockResolvedValue({ ok: false });

    render(
      <div>
        <BackendStatus />
        <CsvUpload />
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText('Backend: no disponible')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Cargar archivo CSV de ECG')).toBeInTheDocument();
  });
});
