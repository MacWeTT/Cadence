import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { PageTransition } from '@/components/page-transition/page-transition';
import { ProgressSkeleton } from '@/components/progress-skeleton/progress-skeleton';
import { ProgressContent } from './progress-content/progress-content';
import './page.css';

const ProgressPage = (props: PageProps<'/progress'>) => {
  const { searchParams } = props;

  const t = useTranslations('progress');

  return (
    <PageTransition fallback={<ProgressSkeleton />}>
      <h1 className="progress-page__title">{t('title')}</h1>
      <ProgressContent searchParams={searchParams} />
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('progress');

  return { title: t('title') };
};

export default ProgressPage;
