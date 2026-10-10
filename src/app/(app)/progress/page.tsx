import { Suspense } from 'react';
import { ProgressSkeleton } from '@/components/progress-skeleton';
import { ProgressContent } from './progress-content';
import './page.css';

const ProgressPage = (props: PageProps<'/progress'>) => {
  const { searchParams } = props;

  return (
    <>
      <h1 className="progress-page__title">Progress</h1>
      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressContent searchParams={searchParams} />
      </Suspense>
    </>
  );
};

export default ProgressPage;
