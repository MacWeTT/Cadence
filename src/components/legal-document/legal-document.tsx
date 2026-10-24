import { useTranslations } from 'next-intl';
import './legal-document.css';

interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalDocumentProps {
  /** Which document to show: its words live in `locales/en/<name>.json`. */
  name: 'privacy' | 'terms';
}

/** A plain-language document (the privacy policy, the terms): a title, the date, an intro, then titled sections. */
export const LegalDocument = (props: LegalDocumentProps) => {
  const { name } = props;

  const t = useTranslations(name);
  const tl = useTranslations('legal');

  const sections = t.raw('sections') as LegalSection[];

  return (
    <article className="legal-document">
      <h1 className="legal-document__title">{t('title')}</h1>
      <p className="legal-document__updated">{tl('updated', { date: t('updated') })}</p>
      <p className="legal-document__text">{t('intro')}</p>
      {sections.map(section => {
        const { title, paragraphs } = section;

        return (
          <section key={title}>
            <h2 className="legal-document__subtitle">{title}</h2>
            {paragraphs.map(paragraph => {
              return (
                <p key={paragraph} className="legal-document__text">
                  {paragraph}
                </p>
              );
            })}
          </section>
        );
      })}
    </article>
  );
};
