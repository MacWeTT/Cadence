import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { ProgressSkeleton } from '@/components/progress-skeleton/progress-skeleton';
import { ProgressContent } from './progress-content/progress-content';
import './page.css';

const ProgressPage = (props: PageProps<'/progress'>) => {
  const { searchParams } = props;

  const t = useTranslations('progress');

  return (
    <>
      <h1 className="progress-page__title">{t('title')}</h1>
      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressContent searchParams={searchParams} />
      </Suspense>
    </>
  );
};

export default ProgressPage;
