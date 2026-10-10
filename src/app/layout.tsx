import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { AppSplash } from '@/components/app-splash/app-splash';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('metadata');

  return {
    applicationName: t('title'),
    title: { default: t('title'), template: t('template') },
    description: t('description'),
    openGraph: { type: 'website', siteName: t('title'), title: t('title'), description: t('description') },
  };
};

// The browser's address bar and the installed app's frame take the page background (see --bg in globals.css).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3e8d3' },
    { media: '(prefers-color-scheme: dark)', color: '#1f1812' },
  ],
};

const RootLayout = async (props: LayoutProps<'/'>) => {
  const { children } = props;

  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AppSplash />
            {children}
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
