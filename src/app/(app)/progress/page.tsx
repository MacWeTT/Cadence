import Link from 'next/link';
import { Suspense } from 'react';
import { ProgressSkeleton } from '@/components/skeleton';
import { Button } from '@/components/ui/button';
import { ratio, type Rate } from '@/domain/rates';
import { formatCalendarDate } from '@/lib/format';
import { habitColor } from '@/lib/palette';
import { streakLabel, streakLength } from '@/lib/today-labels';
import { loadHabitData } from '@/server/habit-data';
import { buildProgress, parseRange, RANGES, type ProgressView } from '@/server/progress-view';
import { Heatmap } from './heatmap';

export default function ProgressPage({ searchParams }: PageProps<'/progress'>) {
  return (
    <>
      <h1 className="font-display text-4xl">Progress</h1>
      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const percent = (rate: Rate) => {
  const r = ratio(rate);
  return r === null ? 'No rate yet' : `${Math.round(r * 100)}%`;
};

const href = (habit: string | null, range: number) => {
  const params = new URLSearchParams();
  if (habit) params.set('habit', habit);
  if (range !== 30) params.set('range', String(range));
  const query = params.toString();
  return query ? `/progress?${query}` : '/progress';
};

const chip = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-clay ${
    active ? 'border-ink bg-ink text-bg' : 'border-line hover:bg-line'
  }`;

const card = 'rounded-2xl border border-line bg-surface p-5';
const heading = 'mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted';

async function ProgressContent({ searchParams }: { searchParams: PageProps<'/progress'>['searchParams'] }) {
  const { habit, range: rangeParam } = await searchParams;
  const { entries, ctx } = await loadHabitData();

  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-surface px-6 py-14 text-center">
        <h2 className="font-display text-2xl">Nothing to show yet</h2>
        <p className="mx-auto mb-6 mt-2 max-w-sm text-ink-muted">
          Your history will build up here once you start ticking habits.
        </p>
        <Button asChild>
          <Link href="/habits">Create a habit</Link>
        </Button>
      </div>
    );
  }

  const view = buildProgress(entries, habit, parseRange(rangeParam), ctx);
  return (
    <div className="mt-6 space-y-6">
      <nav aria-label="Filter by habit" className="flex flex-wrap gap-2">
        <Link
          href={href(null, view.range)}
          aria-current={view.selectedId === null ? 'page' : undefined}
          className={chip(view.selectedId === null)}
        >
          All habits
        </Link>
        {entries.map(({ habit: h }) => (
          <Link
            key={h.id}
            href={href(h.id, view.range)}
            aria-current={view.selectedId === h.id ? 'page' : undefined}
            className={chip(view.selectedId === h.id)}
          >
            <span aria-hidden>{h.icon}</span>
            {h.name}
          </Link>
        ))}
      </nav>

      <section className={card} aria-labelledby="year-heading">
        <h2 id="year-heading" className="mb-4 text-sm">
          <span className="font-display text-2xl">{view.totals.ticks}</span>{' '}
          {view.totals.ticks === 1 ? 'tick' : 'ticks'} in the past year
          <span className="ml-4 text-ink-muted">
            <span className="font-semibold text-ink">{view.totals.activeDays}</span> active{' '}
            {view.totals.activeDays === 1 ? 'day' : 'days'}
          </span>
        </h2>
        <Heatmap months={view.months} single={view.selectedId !== null} />
      </section>

      <Rates view={view} />

      <div className="grid gap-6 md:grid-cols-2">
        <Bars
          title="Ticks per week"
          rows={view.weekly.map(w => ({
            key: w.start,
            label: formatCalendarDate(w.start, { day: 'numeric', month: 'short' }),
            count: w.count,
          }))}
        />
        <Bars
          title="Ticks per month"
          rows={view.monthly.map(m => ({
            key: m.month,
            label: formatCalendarDate(`${m.month}-01`, { month: 'short' }),
            count: m.count,
          }))}
        />
      </div>
    </div>
  );
}

function Rates({ view }: { view: ProgressView }) {
  return (
    <section className={card} aria-labelledby="rate-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="rate-heading" className={heading}>
            Completion, last {view.range} days
          </h2>
          <p className="font-display text-4xl">{percent(view.rate)}</p>
          {view.rate.expected > 0 && (
            <p className="text-sm text-ink-muted">
              {view.rate.done} of {view.rate.expected} done
            </p>
          )}
        </div>
        <nav aria-label="Period" className="flex gap-2">
          {RANGES.map(r => (
            <Link
              key={r}
              href={href(view.selectedId, r)}
              aria-current={view.range === r ? 'page' : undefined}
              className={chip(view.range === r)}
            >
              {r === 365 ? 'Year' : `${r}d`}
            </Link>
          ))}
        </nav>
      </div>

      <ul className="mt-5 divide-y divide-line">
        {view.habits.map(h => (
          <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ backgroundColor: `color-mix(in oklab, ${habitColor(h.color)} 22%, var(--surface))` }}
            >
              {h.icon}
            </span>
            <p className="min-w-0 flex-1 truncate font-semibold">
              {h.name}
              {h.archived && <span className="ml-2 text-sm font-normal text-ink-muted">archived</span>}
            </p>
            <p className="w-28 text-sm text-ink-muted">{h.current ? streakLabel(h.current) : 'No streak'}</p>
            <p className="w-24 text-sm text-ink-muted">Best {h.longest.count > 0 ? streakLength(h.longest) : '—'}</p>
            <p className="w-24 text-right font-semibold">{percent(h.rate)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Bars({ title, rows }: { title: string; rows: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <section className={card} aria-label={title}>
      <h2 className={heading}>{title}</h2>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.key} className="flex items-center gap-3 text-sm">
            <span className="w-14 shrink-0 text-ink-muted">{r.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
            <span className="w-8 text-right tabular-nums">{r.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
