import { cn } from '@/lib/utils';
import type { TodayRow } from '@/server/today-view';
import { CheckRow } from '../check-row/check-row';
import './check-section.css';

interface CheckSectionProps {
  id: string;
  title: string;
  rows: TodayRow[];
  saving: ReadonlySet<string>;
  onToggle: (row: TodayRow) => void;
  /** Drops the top margin, for a list that opens a column. */
  flush?: boolean;
}

/** A titled list of rows (To do, Done, Next up...), shared by Today and Home. */
export const CheckSection = (props: CheckSectionProps) => {
  const { id, title, rows, saving, onToggle, flush } = props;

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className={cn('check-section', flush && 'check-section--flush')}>
      <h2 id={id} className="check-section__title">
        {title}
      </h2>
      <ul aria-labelledby={id}>
        {rows.map(row => {
          return (
            <CheckRow
              key={row.id}
              row={row}
              disabled={saving.has(row.id)}
              onToggle={() => {
                return onToggle(row);
              }}
            />
          );
        })}
      </ul>
    </section>
  );
};
