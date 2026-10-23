'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { RegisterForm } from '@/app/(auth)/register/register-form/register-form';
import { local } from '@/data/local';
import { safeNext } from '@/lib/next-path';

/**
 * The desktop build's register content: the same form, with the account's own data read on the PC from the stored
 * session instead of on a server. An account that has registered goes straight on.
 */
export const RegisterContent = () => {
  const next = useSearchParams().get('next');

  const { data, isError } = useQuery({
    queryKey: ['registration'],
    queryFn: () => {
      return local.registration();
    },
  });

  const goOn = isError || data === null || data?.registered;

  useEffect(() => {
    if (goOn) {
      window.location.replace(data?.registered ? safeNext(next) : '/login');
    }
  }, [goOn, data, next]);

  if (!data || data.registered) {
    return null;
  }

  const { email, tag } = data;

  return <RegisterForm email={email} tag={tag} next={next} />;
};
