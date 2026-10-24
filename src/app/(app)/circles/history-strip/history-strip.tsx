import { useTranslations } from 'next-intl';
import { historyWeeks } from '@/domain/circle-history';
import type { CalendarDate } from '@/domain/dates';
import { cn } from '@/lib/utils';
import './history-strip.css';

const WEEKS = 12;

interface HistoryStripProps {
  ticks: readonly CalendarDate[];
  /** The owner's today. */
  today: CalendarDate;
}

/** The last twelve weeks of a friend's habit as small squares: ticked or not, and nothing that reads as a miss. */
export const HistoryStrip = (props: HistoryStripProps) => {
  const { ticks, today } = props;

  const t = useTranslations('circles.member');

  const weeks = historyWeeks(ticks, today, 1, WEEKS);
  const count = ticks.filter(date => {
    return date >= weeks[0][0].date && date <= today;
  }).length;

  return (
    <div role="img" aria-label={t('history', { count, weeks: WEEKS })} className="history-strip">
      {weeks.map(week => {
        return (
          <div key={week[0].date} className="history-strip__week">
            {week.map(({ date, done, future }) => {
              return (
                <span
                  key={date}
                  className={cn(
                    'history-strip__day',
                    done && 'history-strip__day--done',
                    future && 'history-strip__day--future',
                  )}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
