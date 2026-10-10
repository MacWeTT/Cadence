'use client';

import { useSearchParams } from 'next/navigation';

export function LoginError() {
  if (useSearchParams().get('error') !== 'auth') return null;
  return (
    <p role="alert" className="mb-4 text-sm text-danger">
      Sign-in didn&apos;t complete. Please try again.
    </p>
  );
}
