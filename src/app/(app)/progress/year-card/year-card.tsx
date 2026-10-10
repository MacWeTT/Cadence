import { useTranslations } from 'next-intl';
import type { ProgressView } from '@/server/progress-view';
import { Heatmap } from '../heatmap/heatmap';
import { ProgressCard } from '../progress-card/progress-card';
import './year-card.css';

interface YearCardProps {
  view: ProgressView;
}

/** The year heatmap with its totals. */
export const YearCard = (props: YearCardProps) => {
  const { view } = props;

  const t = useTranslations('progress.year');

  return (
    <ProgressCard labelledBy="year-heading">
      <h2 id="year-heading" className="year-card__title">
        {t.rich('ticks', {
          count: view.totals.ticks,
          ticks: chunks => {
            return <span className="year-card__ticks">{chunks}</span>;
          },
        })}
        <span className="year-card__days">
          {t.rich('activeDays', {
            count: view.totals.activeDays,
            days: chunks => {
              return <span className="year-card__days-count">{chunks}</span>;
            },
          })}
        </span>
      </h2>
      <Heatmap months={view.months} single={view.selectedId !== null} />
    </ProgressCard>
  );
};
