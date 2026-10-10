import { RANGES, type ProgressView } from '@/server/progress-view';
import { ChipLink } from '../chip-link/chip-link';
import { ProgressCard } from '../progress-card/progress-card';
import { percent, progressHref } from '../progress-links';
import { RatesRow } from '../rates-row/rates-row';
import './rates-card.css';

interface RatesCardProps {
  view: ProgressView;
}

/** The completion rate over the chosen period, with a row per habit. */
export const RatesCard = (props: RatesCardProps) => {
  const { view } = props;

  return (
    <ProgressCard labelledBy="rate-heading">
      <div className="rates-card__top">
        <div>
          <h2 id="rate-heading" className="rates-card__title">
            Completion, last {view.range} days
          </h2>
          <p className="rates-card__percent">{percent(view.rate)}</p>
          {view.rate.expected > 0 && (
            <p className="rates-card__detail">
              {view.rate.done} of {view.rate.expected} done
            </p>
          )}
        </div>
        <nav aria-label="Period" className="rates-card__periods">
          {RANGES.map(r => {
            return (
              <ChipLink key={r} href={progressHref(view.selectedId, r)} active={view.range === r}>
                {r === 365 ? 'Year' : `${r}d`}
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
