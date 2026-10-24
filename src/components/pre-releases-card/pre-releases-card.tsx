import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Arrive } from '@/components/arrive/arrive';
import './pre-releases-card.css';

interface PreReleasesCardProps {
  /** The oldest and the newest pre-release line (0.3 and 0.8). */
  from: string;
  to: string;
  /** Its place in the list: later cards come in a little after earlier ones. */
  index: number;
}

/** One quiet card on What's new that leads to the versions before 1.0, so they do not crowd the releases. */
export const PreReleasesCard = (props: PreReleasesCardProps) => {
  const { from, to, index } = props;

  const t = useTranslations('changelog');

  return (
    <Arrive index={index}>
      <section aria-labelledby="changelog-pre-releases" className="pre-releases-card">
        <h2 id="changelog-pre-releases" className="pre-releases-card__title">
          {t('preReleases')}
        </h2>
        <p className="pre-releases-card__text">{t('preReleasesText', { from, to })}</p>
        <Link href="/changelog/pre-releases" className="pre-releases-card__more">
          {t('seePreReleases')}
        </Link>
      </section>
    </Arrive>
  );
};
