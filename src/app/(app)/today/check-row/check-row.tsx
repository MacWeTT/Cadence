'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { habitColor } from '@/lib/palette';
import { streakLabel, weekLabel } from '@/lib/today-labels';
import type { TodayRow } from '@/server/today-view';
import './check-row.css';

interface CheckRowProps {
  row: TodayRow;
  /** True while a save for this row is in flight, so a double tap sends one request. */
  disabled: boolean;
  onToggle: () => void;
}

export const CheckRow = (props: CheckRowProps) => {
  const { row, disabled, onToggle } = props;

  return (
    <li className="check-row">
      <button
        type="button"
        role="checkbox"
        id={`check-${row.id}`}
        aria-checked={row.ticked}
        aria-label={row.ticked ? `Mark ${row.name} not done` : `Mark ${row.name} done`}
        // aria-disabled, not disabled: a disabled button drops keyboard focus; the toggle ignores taps while saving.
        aria-disabled={disabled}
        onClick={onToggle}
        className={cn('check-row__box', row.ticked && 'check-row__box--done')}
      >
        {row.ticked && <Check className="check-row__check" aria-hidden />}
      </button>
      <span
        aria-hidden
        className="check-row__icon"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(row.color)} 22%, var(--surface))` }}
      >
        {row.icon}
      </span>
      <p className={cn('check-row__name', row.ticked && 'check-row__name--done')}>{row.name}</p>
      <div className="check-row__tags">
        {row.week && <span>{weekLabel(row.week)}</span>}
        {row.week && row.streak && <span aria-hidden>·</span>}
        {row.streak && <span>{streakLabel(row.streak)}</span>}
      </div>
    </li>
  );
};
