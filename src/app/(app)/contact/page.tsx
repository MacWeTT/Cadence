import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactForm } from '@/app/(app)/contact/contact-form/contact-form';
import { Arrive } from '@/components/arrive/arrive';
import { PageTransition } from '@/components/page-transition/page-transition';
import { Skeleton } from '@/components/skeleton/skeleton';
import { getAccountContact } from '@/server/account';
import './page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('contact');

  return { title: t('pageTitle') };
};

/** The whole page waits for the account's name and email and arrives in one piece, like the other pages. */
const ContactPage = () => {
  return (
    <PageTransition fallback={<Skeleton shape="card-large" />}>
      <ContactContent />
    </PageTransition>
  );
};

export default ContactPage;

const ContactContent = async () => {
  const t = await getTranslations('contact');
  const { name, email } = await getAccountContact();

  return (
    <div className="contact">
      <Arrive index={0}>
        <h1 className="contact__title">{t('title')}</h1>
        <p className="contact__intro">{t('intro')}</p>
      </Arrive>
      <Arrive index={1}>
        <ContactForm name={name} email={email} />
      </Arrive>
    </div>
  );
};
