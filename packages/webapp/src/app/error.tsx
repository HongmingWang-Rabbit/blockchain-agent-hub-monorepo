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
    // Log the error to console (you could send to error tracking service)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="text-8xl mb-6">⚠️</div>
      <h1 className="text-4xl font-bold mb-4">Something Went Wrong</h1>
      <p className="text-white/60 mb-4 max-w-md">
        The agent encountered an unexpected error. This might be a temporary issue.
      </p>
      {error.message && (
        <p className="text-sm text-red-400/80 mb-6 font-mono max-w-lg break-all">
          {error.message}
        </p>
      )}
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="btn-primary"
        >
          Try Again
        </button>
        <a href="/" className="btn-secondary">
          Go Home
        </a>
      </div>
    </div>
  );
}
