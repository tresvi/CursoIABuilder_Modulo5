import { useEffect, useState } from 'react';
import { checkHealth } from '@/lib/api/client';

type BackendState = 'checking' | 'ok' | 'unreachable';

/**
 * Indicador de conectividad con el backend (FEAT-007a, Block 4). Consulta
 * `checkHealth()` una vez al montar y muestra el resultado; mientras se
 * resuelve no renderiza nada visible, para evitar el parpadeo de contenido.
 * Se monta independiente del resto de la app: su estado nunca condiciona el
 * renderizado de otros componentes (AC-03 — la app sigue 100% usable sin backend).
 */
export function BackendStatus() {
  const [state, setState] = useState<BackendState>('checking');

  useEffect(() => {
    let cancelled = false;

    checkHealth().then((result) => {
      if (cancelled) return;
      setState(result.ok ? 'ok' : 'unreachable');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'checking') {
    return null;
  }

  return <p className="text-sm">{state === 'ok' ? 'Backend: conectado' : 'Backend: no disponible'}</p>;
}
