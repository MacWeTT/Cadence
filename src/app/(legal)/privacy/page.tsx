import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalDocument } from '@/components/legal-document/legal-document';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('privacy');

  return { title: t('pageTitle') };
};

const PrivacyPage = () => {
  return <LegalDocument name="privacy" />;
};

export default PrivacyPage;
