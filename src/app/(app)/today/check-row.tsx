'use client';

import { Check } from 'lucide-react';
import { habitColor } from '@/lib/palette';
import { streakLabel, weekLabel } from '@/lib/today-labels';
import type { TodayRow } from '@/server/today-view';

/** A titled list of rows (To do, Done, Next up...), shared by Today and Home. */
export function CheckSection({
  id,
  title,
  rows,
  saving,
  onToggle,
  className = 'mt-8',
}: {
  id: string;
  title: string;
  rows: TodayRow[];
  saving: ReadonlySet<string>;
  onToggle: (row: TodayRow) => void;
  className?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className={className}>
      <h2 id={id} className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">
        {title}
      </h2>
      <ul aria-labelledby={id}>
        {rows.map(row => (
          <CheckRow key={row.id} row={row} disabled={saving.has(row.id)} onToggle={() => onToggle(row)} />
        ))}
      </ul>
    </section>
  );
}

export function CheckRow({
  row,
  disabled,
  onToggle,
}: {
  row: TodayRow;
  /** True while a save for this row is in flight, so a double tap sends one request. */
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center gap-4 border-b border-line px-3 py-3.5">
      <button
        type="button"
        role="checkbox"
        id={`check-${row.id}`}
        aria-checked={row.ticked}
        aria-label={row.ticked ? `Mark ${row.name} not done` : `Mark ${row.name} done`}
        // aria-disabled, not disabled: a disabled button drops keyboard focus; the toggle ignores taps while saving.
        aria-disabled={disabled}
        onClick={onToggle}
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay aria-disabled:opacity-60 ${
          row.ticked ? 'border-primary bg-primary text-primary-foreground' : 'border-ink-muted hover:border-ink'
        }`}
      >
        {row.ticked && <Check className="size-4" aria-hidden />}
      </button>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(row.color)} 22%, var(--surface))` }}
      >
        {row.icon}
      </span>
      <p className={`min-w-0 flex-1 truncate font-semibold ${row.ticked ? 'text-ink-muted line-through' : ''}`}>
        {row.name}
      </p>
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        {row.week && <span>{weekLabel(row.week)}</span>}
        {row.week && row.streak && <span aria-hidden>·</span>}
        {row.streak && <span>{streakLabel(row.streak)}</span>}
      </div>
    </li>
  );
}
