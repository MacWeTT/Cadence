'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { dataSource } from '@/data';
import './sign-out-form.css';

/** The profile's Sign out button. */
export const SignOutForm = () => {
  const t = useTranslations('common.account');

  return (
    <form action={dataSource.signOut} className="sign-out-form">
      <Button type="submit" variant="destructive">
        <LogOut aria-hidden />
        {t('signOut')}
      </Button>
    </form>
  );
};
