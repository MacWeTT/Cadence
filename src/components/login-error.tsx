'use client';

import { useSearchParams } from 'next/navigation';
import './login-error.css';

export const LoginError = () => {
  if (useSearchParams().get('error') !== 'auth') {
    return null;
  }

  return (
    <p role="alert" className="login-error">
      Sign-in didn&apos;t complete. Please try again.
    </p>
  );
};
