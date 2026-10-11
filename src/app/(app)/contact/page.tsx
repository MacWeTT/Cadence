import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ContactForm } from '@/app/(app)/contact/contact-form/contact-form';
import { Arrive } from '@/components/arrive/arrive';
import { PageTransition } from '@/components/page-transition/page-transition';
import { getAccountContact } from '@/server/account';
import './page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('contact');

  return { title: t('pageTitle') };
};

const ContactPage = () => {
  const t = useTranslations('contact');

  return (
    <PageTransition>
      <div className="contact">
        <Arrive index={0}>
          <h1 className="contact__title">{t('title')}</h1>
          <p className="contact__intro">{t('intro')}</p>
        </Arrive>
        <Arrive index={1}>
          <Suspense>
            <ContactFormWithAccount />
          </Suspense>
        </Arrive>
      </div>
    </PageTransition>
  );
};

export default ContactPage;

/** The form, offering the signed-in user's name and email as the way to answer. */
const ContactFormWithAccount = async () => {
  const { name, email } = await getAccountContact();

  return <ContactForm name={name} email={email} />;
};
