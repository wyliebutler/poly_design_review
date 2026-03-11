'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[GLOBAL ERROR BOUNDARY]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6 text-center">
      <div className="max-w-xl w-full border border-red-500/20 bg-red-500/5 p-12 backdrop-blur-xl">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-red-500 mb-6">
          Critical _ Runtime _ Failure
        </h2>
        <div className="bg-black/50 border border-white/5 p-6 mb-8 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500/50 mb-2">Error Diagnostic</p>
          <code className="text-xs font-mono text-red-400 break-all leading-relaxed">
            {error.message || 'An unexpected client-side exception occurred.'}
          </code>
          {error.digest && (
            <p className="mt-4 text-[8px] font-mono opacity-30 uppercase tracking-widest">
              ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-black italic uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            Attempt Recovery
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black italic uppercase tracking-widest text-xs transition-all active:scale-95 border border-white/10"
          >
            Full Re-Sync
          </button>
        </div>
      </div>
    </div>
  );
}
