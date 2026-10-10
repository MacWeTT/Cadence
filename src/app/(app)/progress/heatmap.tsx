import { formatCalendarDate } from '@/lib/format';
import type { HeatCell, MonthBlock } from '@/server/progress-view';

const tooltip = (cell: HeatCell, single: boolean) => {
  const day = formatCalendarDate(cell.date, { weekday: 'short', day: 'numeric', month: 'short' });
  if (single) return `${day}: ${cell.done ? 'done' : 'not done'}`;
  return `${day}: ${cell.done} of ${Math.max(cell.done, Math.round(cell.expected))} done`;
};

/**
 * The past year as month blocks, LeetCode style: each month is its own run of week columns with its name beneath.
 * One grid with equal week columns (and a narrow spacer between months) shares the card's width, so every square is
 * the same size, the whole year always fits and nothing scrolls. The grid is a picture for the eye (the numbers are
 * in the cards around it, and each square names its day on hover).
 */
export function Heatmap({ months, single }: { months: MonthBlock[]; single: boolean }) {
  const tracks = months.map(m => `repeat(${m.columns.length}, minmax(0, 1fr))`).join(' 0.5rem ');
  // The grid column where each month begins (a spacer column sits between months).
  const starts = months.map((_, k) => months.slice(0, k).reduce((n, m) => n + m.columns.length + 1, 1));
  return (
    <div
      role="img"
      aria-label="Activity over the past year"
      className="grid gap-x-0.5 gap-y-0.5"
      style={{ gridTemplateColumns: tracks }}
    >
      {months.flatMap((block, k) => {
        const first = starts[k];
        return [
          ...block.columns.flatMap((column, i) =>
            column.map((cell, d) =>
              cell === null ? null : (
                <div
                  key={cell.date}
                  title={cell.level === null ? undefined : tooltip(cell, single)}
                  className={`aspect-square rounded-xs ${cell.level === null ? 'bg-line/30' : ''}`}
                  style={{
                    gridColumn: first + i,
                    gridRow: d + 1,
                    ...(cell.level === null ? {} : { backgroundColor: `var(--heat-${cell.level})` }),
                  }}
                />
              ),
            ),
          ),
          <p
            key={block.month}
            className="mt-1.5 text-xs text-ink-muted"
            style={{ gridColumn: `${first} / span ${block.columns.length}`, gridRow: 8 }}
          >
            {formatCalendarDate(`${block.month}-01`, { month: 'short' })}
          </p>,
        ];
      })}
    </div>
  );
}
