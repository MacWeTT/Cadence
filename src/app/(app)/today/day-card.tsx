import Link from 'next/link';
import type { CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import type { DaySummary } from '@/server/today-view';

const cellClass = (d: DaySummary) => {
  if (d.future || d.total === 0) return 'border border-dashed border-line text-ink-muted';
  if (d.done === d.total) return 'bg-primary text-primary-foreground';
  if (d.done > 0) return 'border border-primary bg-primary/25';
  return 'border border-line';
};

const cellLabel = (d: DaySummary) =>
  `${formatCalendarDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' })}: ${
    d.future ? 'not yet' : d.total === 0 ? 'nothing planned' : `${d.done} of ${d.total} done`
  }`;

function DayCell({ d, viewed, today }: { d: DaySummary; viewed: boolean; today: CalendarDate }) {
  const className = `mt-1 flex aspect-square items-center justify-center rounded-lg text-xs ${cellClass(d)} ${
    viewed ? 'outline-2 outline-offset-2 outline-ink' : ''
  }`;
  if (d.future) return <span role="img" aria-label={cellLabel(d)} className={className} />;
  return (
    <Link
      href={d.date === today ? '/today' : `/today?date=${d.date}`}
      aria-label={cellLabel(d)}
      aria-current={viewed ? 'date' : undefined}
      className={className}
    >
      {d.total > 0 ? d.done : ''}
    </Link>
  );
}

/** The seven days of a week as small cells; each links to that day on Today. */
export function WeekStrip({ strip, date, today }: { strip: DaySummary[]; date: CalendarDate; today: CalendarDate }) {
  return (
    <>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">This week</h2>
      <ul className="grid grid-cols-7 gap-1.5">
        {strip.map(d => (
          <li key={d.date} className="text-center">
            <span aria-hidden className="text-xs text-ink-muted">
              {formatCalendarDate(d.date, { weekday: 'narrow' })}
            </span>
            <DayCell d={d} viewed={d.date === date} today={today} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** The margin card: how far through the viewed day you are, and the week at a glance. */
export function DayCard({
  done,
  total,
  strip,
  date,
  today,
}: {
  done: number;
  total: number;
  strip: DaySummary[];
  date: CalendarDate;
  today: CalendarDate;
}) {
  return (
    <aside aria-label="Progress" className="rounded-2xl border border-line bg-surface p-5">
      <p className="font-display text-3xl">
        {done} <span className="text-xl text-ink-muted">of {total}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Habits done"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-3 h-2 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
        />
      </div>
      <div className="mt-6">
        <WeekStrip strip={strip} date={date} today={today} />
      </div>
    </aside>
  );
}
