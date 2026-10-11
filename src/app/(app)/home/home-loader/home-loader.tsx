'use client';

import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/empty-state/empty-state';
import { HomeSkeleton } from '@/components/home-skeleton/home-skeleton';
import { Button } from '@/components/ui/button';
import { HomeClient } from '@/app/(app)/home/home-client/home-client';
import { useHomeData } from '@/app/(app)/home/use-home';

/** The Home page: read from the browser's cache at once when it is there, a skeleton only on the very first visit. */
export const HomeLoader = () => {
  const t = useTranslations('home');
  const { data, isError, refetch } = useHomeData();

  const onRetry = () => {
    void refetch();
  };

  if (data) {
    return <HomeClient data={data} />;
  }

  return isError ? (
    <EmptyState
      title={t('loadFailedTitle')}
      text={t('loadFailedText')}
      action={<Button onClick={onRetry}>{t('retry')}</Button>}
    />
  ) : (
    <HomeSkeleton />
  );
};
