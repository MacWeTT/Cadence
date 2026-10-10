import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { getTodayView } from '@/server/today';
import { TodayClient } from './today-client/today-client';

const TodayPage = (props: PageProps<'/today'>) => {
  const { searchParams } = props;

  const t = useTranslations('today');

  return (
    <Suspense fallback={<ListSkeleton title={t('title')} />}>
      <TodayContent searchParams={searchParams} />
    </Suspense>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('today');

  return { title: t('title') };
};

export default TodayPage;

interface TodayContentProps {
  searchParams: PageProps<'/today'>['searchParams'];
}

const TodayContent = async (props: TodayContentProps) => {
  const { searchParams } = props;

  const { date } = await searchParams;

  return <TodayClient {...await getTodayView(date)} />;
};
