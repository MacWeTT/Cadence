'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { OpenLinksButton } from '@/components/open-links-button/open-links-button';
import { useMsg } from '@/lib/use-msg';
import { habitColor } from '@/lib/palette';
import { streakMsg, weekMsg, yearMsg } from '@/lib/today-labels';
import { cn } from '@/lib/utils';
import type { TodayRow } from '@/server/today-view';
import './check-row.css';

interface CheckRowProps {
  row: TodayRow;
  /** True while a save for this row is in flight, so a double tap sends one request. */
  disabled: boolean;
  onToggle: (row: TodayRow) => void;
}

export const CheckRow = (props: CheckRowProps) => {
  const { row, disabled, onToggle } = props;

  const t = useTranslations('today.row');
  const tm = useMsg();

  const { id, ticked, name, icon, color, week, streak, year, links } = row;

  const onClick = () => {
    onToggle(row);
  };

  return (
    // layoutId: the row glides between To do and Done, and the rows around it slide into the gap.
    <motion.li
      layout="position"
      layoutId={id}
      transition={{ type: 'spring', stiffness: 500, damping: 42 }}
      className="check-row"
    >
      <button
        type="button"
        role="checkbox"
        id={`check-${id}`}
        aria-checked={ticked}
        aria-label={ticked ? t('markNotDone', { name: name }) : t('markDone', { name: name })}
        // aria-disabled, not disabled: a disabled button drops keyboard focus; the toggle ignores taps while saving.
        aria-disabled={disabled}
        onClick={onClick}
        className={cn('check-row__box', ticked && 'check-row__box--done')}
      >
        {ticked && <Check className="check-row__check" aria-hidden />}
      </button>
      <span
        aria-hidden
        className="check-row__icon"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(color)} 22%, var(--surface))` }}
      >
        {icon}
      </span>
      <p className={cn('check-row__name', ticked && 'check-row__name--done')}>{name}</p>
      <div className="check-row__tags">
        {week && <span>{tm(weekMsg(week))}</span>}
        {week && streak && <span aria-hidden>{'·'}</span>}
        {streak && <span>{tm(streakMsg(streak))}</span>}
        {year !== undefined && <span>{tm(yearMsg(year))}</span>}
      </div>
      {links && <OpenLinksButton links={links} name={name} />}
    </motion.li>
  );
};
