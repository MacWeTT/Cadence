import { useTranslations } from 'next-intl';
import { formatCalendarDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MonthBlock } from '@/server/progress-view';
import './heatmap.css';

interface HeatmapProps {
  months: MonthBlock[];
  single: boolean;
}

/**
 * The past year as month blocks, LeetCode style: each month is its own run of week columns with its name beneath.
 * One grid with equal week columns (and a narrow spacer between months) shares the card's width, so every square is
 * the same size, the whole year always fits and nothing scrolls. The grid is a picture for the eye (the numbers are
 * in the cards around it, and each square names its day on hover).
 */
export const Heatmap = (props: HeatmapProps) => {
  const { months, single } = props;

  const t = useTranslations('progress.year');

  const tracks = months
    .map(m => {
      return `repeat(${m.columns.length}, minmax(0, 1fr))`;
    })
    .join(' 0.5rem ');
  // The grid column where each month begins (a spacer column sits between months).
  const starts = months.map((_, k) => {
    return months.slice(0, k).reduce((n, m) => {
      return n + m.columns.length + 1;
    }, 1);
  });

  return (
    <div role="img" aria-label={t('heatmap')} className="heatmap" style={{ gridTemplateColumns: tracks }}>
      {months.flatMap((block, k) => {
        const first = starts[k];

        return [
          ...block.columns.flatMap((column, i) => {
            return column.map((cell, d) => {
              if (cell === null) {
                return null;
              }

              const day = formatCalendarDate(cell.date, { weekday: 'short', day: 'numeric', month: 'short' });
              const title = single
                ? cell.done
                  ? t('singleDone', { day })
                  : t('singleNotDone', { day })
                : t('cell', { day, done: cell.done, total: Math.max(cell.done, Math.round(cell.expected)) });

              return (
                <div
                  key={cell.date}
                  title={cell.level === null ? undefined : title}
                  className={cn('heatmap__cell', cell.level === null && 'heatmap__cell--blank')}
                  style={{
                    gridColumn: first + i,
                    gridRow: d + 1,
                    ...(cell.level === null ? {} : { backgroundColor: `var(--heat-${cell.level})` }),
                  }}
                />
              );
            });
          }),
          <p
            key={block.month}
            className="heatmap__month"
            style={{ gridColumn: `${first} / span ${block.columns.length}`, gridRow: 8 }}
          >
            {formatCalendarDate(`${block.month}-01`, { month: 'short' })}
          </p>,
        ];
      })}
    </div>
  );
};
