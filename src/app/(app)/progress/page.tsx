import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageTransition } from '@/components/page-transition/page-transition';
import { ProgressSkeleton } from '@/components/progress-skeleton/progress-skeleton';
import { ProgressContent } from '@/app/(app)/progress/progress-content/progress-content';
import './page.css';

const ProgressPage = () => {
  const t = useTranslations('progress');

  return (
    <PageTransition>
      <h1 className="progress-page__title">{t('title')}</h1>
      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressContent />
      </Suspense>
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('progress');

  return { title: t('title') };
};

export default ProgressPage;
