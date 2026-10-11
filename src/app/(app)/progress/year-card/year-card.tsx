import { useTranslations } from 'next-intl';
import type { ProgressView } from '@/server/progress-view';
import { Heatmap } from '@/app/(app)/progress/heatmap/heatmap';
import { ProgressCard } from '@/app/(app)/progress/progress-card/progress-card';
import './year-card.css';

interface YearCardProps {
  view: ProgressView;
}

/** The year heatmap with its totals. */
export const YearCard = (props: YearCardProps) => {
  const { view } = props;

  const t = useTranslations('progress.year');

  const {
    totals: { ticks, activeDays },
    months,
    selectedId,
  } = view;

  return (
    <ProgressCard labelledBy="year-heading">
      <h2 id="year-heading" className="year-card__title">
        {t.rich('ticks', {
          count: ticks,
          ticks: chunks => {
            return <span className="year-card__ticks">{chunks}</span>;
          },
        })}
        <span className="year-card__days">
          {t.rich('activeDays', {
            count: activeDays,
            days: chunks => {
              return <span className="year-card__days-count">{chunks}</span>;
            },
          })}
        </span>
      </h2>
      <Heatmap months={months} single={selectedId !== null} />
    </ProgressCard>
  );
};
