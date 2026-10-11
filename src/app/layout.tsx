import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { AppSplash } from '@/components/app-splash/app-splash';
import { MotionProvider } from '@/components/motion-provider/motion-provider';
import { ThemeFavicon } from '@/components/theme-favicon/theme-favicon';
import { ServiceWorkerRegister } from '@/components/service-worker-register/service-worker-register';
import { Toaster } from '@/components/ui/sonner';
import { BOOT_SCRIPT } from '@/lib/appearance';
import './globals.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('metadata');

  return {
    applicationName: t('title'),
    title: { default: t('title'), template: t('template') },
    description: t('description'),
    appleWebApp: { capable: true, title: t('title'), statusBarStyle: 'default' },
    openGraph: { type: 'website', siteName: t('title'), title: t('title'), description: t('description') },
  };
};

// The browser's address bar and the installed app's frame take the page background (see --bg in globals.css).
export const viewport: Viewport = {
  viewportFit: 'cover', // lets the layout use the whole screen and keep clear of notches with env(safe-area-inset-*)
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3e8d3' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1d21' },
  ],
};

const RootLayout = async (props: LayoutProps<'/'>) => {
  const { children } = props;

  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Puts the saved theme and accent on <html> before the first paint (see src/lib/appearance.ts). */}
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={['light', 'dark']}>
            <MotionProvider>
              <ThemeFavicon />
              <AppSplash />
              <ServiceWorkerRegister />
              {children}
              <Toaster />
            </MotionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
