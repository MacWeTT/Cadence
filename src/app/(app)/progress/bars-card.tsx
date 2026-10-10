import { ProgressCard } from './progress-card';
import './bars-card.css';

interface BarsCardProps {
  title: string;
  rows: { key: string; label: string; count: number }[];
}

/** A small horizontal bar chart: one row per week or month. */
export const BarsCard = (props: BarsCardProps) => {
  const { title, rows } = props;

  const max = Math.max(
    1,
    ...rows.map(r => {
      return r.count;
    }),
  );

  return (
    <ProgressCard label={title}>
      <h2 className="bars-card__title">{title}</h2>
      <ul className="bars-card__list">
        {rows.map(r => {
          return (
            <li key={r.key} className="bars-card__row">
              <span className="bars-card__label">{r.label}</span>
              <span className="bars-card__track">
                <span className="bars-card__fill" style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className="bars-card__count">{r.count}</span>
            </li>
          );
        })}
      </ul>
    </ProgressCard>
  );
};
