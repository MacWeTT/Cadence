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

  return (
    <ProgressCard labelledBy="year-heading">
      <h2 id="year-heading" className="year-card__title">
        <span className="year-card__ticks">{view.totals.ticks}</span> {view.totals.ticks === 1 ? 'tick' : 'ticks'} in
        the past year
        <span className="year-card__days">
          <span className="year-card__days-count">{view.totals.activeDays}</span> active{' '}
          {view.totals.activeDays === 1 ? 'day' : 'days'}
        </span>
      </h2>
      <Heatmap months={view.months} single={view.selectedId !== null} />
    </ProgressCard>
  );
};
