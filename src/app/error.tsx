'use client';

import { useEffect } from 'react';

import { logger } from '@/utils/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Unhandled application error', error, { component: 'AppErrorBoundary' });
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-200">Algo deu errado!</h2>
        <p className="text-neutral-400">{error.message || 'Ocorreu um erro inesperado'}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
