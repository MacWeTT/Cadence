import { useTranslations } from 'next-intl';
import { useMsg } from '@/lib/use-msg';
import { RANGES, type ProgressView } from '@/server/progress-view';
import { ChipLink } from '../chip-link/chip-link';
import { ProgressCard } from '../progress-card/progress-card';
import { percentMsg, progressHref } from '../progress-links';
import { RatesRow } from '../rates-row/rates-row';
import './rates-card.css';

interface RatesCardProps {
  view: ProgressView;
}

/** The completion rate over the chosen period, with a row per habit. */
export const RatesCard = (props: RatesCardProps) => {
  const { view } = props;

  const t = useTranslations('progress.rates');
  const tm = useMsg();

  return (
    <ProgressCard labelledBy="rate-heading">
      <div className="rates-card__top">
        <div>
          <h2 id="rate-heading" className="rates-card__title">
            {t('title', { range: view.range })}
          </h2>
          <p className="rates-card__percent">{tm(percentMsg(view.rate))}</p>
          {view.rate.expected > 0 && (
            <p className="rates-card__detail">{t('detail', { done: view.rate.done, expected: view.rate.expected })}</p>
          )}
        </div>
        <nav aria-label={t('period')} className="rates-card__periods">
          {RANGES.map(r => {
            return (
              <ChipLink key={r} href={progressHref(view.selectedId, r)} active={view.range === r}>
                {r === 365 ? t('year') : t('days', { range: r })}
              </ChipLink>
            );
          })}
        </nav>
      </div>

      <ul className="rates-card__list">
        {view.habits.map(h => {
          return <RatesRow key={h.id} habit={h} />;
        })}
      </ul>
    </ProgressCard>
  );
};
