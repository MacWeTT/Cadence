'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import './not-found.css';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** What a page that crashed shows instead of a blank screen: say so, offer to try again, and a way back. */
const ErrorPage = (props: ErrorPageProps) => {
  const { reset } = props;

  const t = useTranslations('common.crash');

  return (
    <main className="not-found">
      <EmptyState
        title={t('heading')}
        text={t('text')}
        action={
          <div className="not-found__actions">
            <Button onClick={reset}>{t('retry')}</Button>
            <Button asChild variant="outline">
              <Link href="/">{t('home')}</Link>
            </Button>
          </div>
        }
      />
    </main>
  );
};

export default ErrorPage;
