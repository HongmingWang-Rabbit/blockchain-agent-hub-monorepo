'use client';

import { useState, useCallback } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-sm transition-colors ${
        copied ? 'text-green-400' : 'text-white/60 hover:text-white'
      } ${className}`}
      title={`Copy ${label || 'to clipboard'}`}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

// Helper component to display truncated address with copy button
interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  className?: string;
}

export function AddressDisplay({ address, truncate = true, className = '' }: AddressDisplayProps) {
  const displayAddress = truncate
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  return (
    <span className={`inline-flex items-center gap-2 font-mono ${className}`}>
      <span title={address}>{displayAddress}</span>
      <CopyButton text={address} />
    </span>
  );
}
