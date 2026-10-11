import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { AccentPicker } from '@/components/accent-picker/accent-picker';
import { AppearancePreview } from '@/components/appearance-preview/appearance-preview';
import { ModePicker } from '@/components/mode-picker/mode-picker';
import { ThemePicker } from '@/components/theme-picker/theme-picker';
import './page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('appearance');

  return { title: t('pageTitle') };
};

const AppearancePage = () => {
  const t = useTranslations('appearance');

  return (
    <div className="appearance">
      <header>
        <h1 className="appearance__title">{t('title')}</h1>
        <p className="appearance__intro">{t('intro')}</p>
      </header>
      <div className="appearance__layout">
        <div className="appearance__settings">
          <ModePicker />
          <ThemePicker />
          <AccentPicker />
        </div>
        <aside className="appearance__aside">
          <AppearancePreview />
        </aside>
      </div>
    </div>
  );
};

export default AppearancePage;
