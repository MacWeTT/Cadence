import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import './not-found.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('common.notFound');

  return { title: t('title') };
};

/** What any address that does not exist shows, on the website and in the desktop app, with a way back. */
const NotFound = () => {
  const t = useTranslations('common.notFound');

  return (
    <main className="not-found">
      <EmptyState
        title={t('heading')}
        text={t('text')}
        action={
          <Button asChild>
            <Link href="/">{t('home')}</Link>
          </Button>
        }
      />
    </main>
  );
};

export default NotFound;
