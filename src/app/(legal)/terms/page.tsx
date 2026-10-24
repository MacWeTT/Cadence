import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalDocument } from '@/components/legal-document/legal-document';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('terms');

  return { title: t('pageTitle') };
};

const TermsPage = () => {
  return <LegalDocument name="terms" />;
};

export default TermsPage;
