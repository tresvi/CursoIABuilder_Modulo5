const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5080';

export type HealthResult = { ok: boolean };

/**
 * Consulta `GET /api/health` del backend. Nunca lanza: cualquier fallo de red
 * (backend caído, CORS bloqueado, timeout) se traduce a `{ ok: false }`, para
 * que el llamador no necesite un `try/catch` propio.
 */
export async function checkHealth(): Promise<HealthResult> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
