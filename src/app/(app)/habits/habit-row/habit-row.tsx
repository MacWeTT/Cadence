'use client';

import { Ellipsis } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OpenLinksButton } from '@/components/open-links-button/open-links-button';
import { formatCalendarDate } from '@/lib/format';
import { habitColor } from '@/lib/palette';
import { scheduleMsg } from '@/lib/schedule-label';
import { useMsg } from '@/lib/use-msg';
import { cn } from '@/lib/utils';
import type { HabitListItem } from '@/server/habit-view';
import './habit-row.css';

export interface HabitRowActions {
  /** Called with the menu button, so focus can return to it when the dialog closes. */
  onEdit: (habit: HabitListItem, opener: HTMLElement | null) => void;
  onArchive: (habit: HabitListItem) => void;
  onRestore: (habit: HabitListItem) => void;
  onDelete: (habit: HabitListItem, opener: HTMLElement | null) => void;
}

interface HabitRowProps {
  habit: HabitListItem;
  /** A readable archive date. Present only for archived habits. */
  archivedOn?: string;
  actions: HabitRowActions;
}

export const HabitRow = (props: HabitRowProps) => {
  const { habit, archivedOn, actions } = props;

  const t = useTranslations('habits.row');
  const ta = useTranslations('common.actions');
  const tm = useMsg();
  const menuButton = useRef<HTMLButtonElement>(null);

  const { icon, color, name, description, schedule, pendingSchedule: pending, links } = habit;
  const archived = archivedOn !== undefined;

  const onRestore = () => {
    actions.onRestore(habit);
  };

  const onDelete = () => {
    actions.onDelete(habit, menuButton.current);
  };

  const onEdit = () => {
    actions.onEdit(habit, menuButton.current);
  };

  const onArchive = () => {
    actions.onArchive(habit);
  };

  return (
    <li className={cn('habit-row', archived && 'habit-row--archived')}>
      <span
        aria-hidden
        className="habit-row__icon"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(color)} 22%, var(--surface))` }}
      >
        {icon}
      </span>
      <div className="habit-row__body">
        <p className="habit-row__name">{name}</p>
        {archived ? (
          <p className="habit-row__note">{t('archivedOn', { date: archivedOn })}</p>
        ) : (
          description && <p className="habit-row__note">{description}</p>
        )}
      </div>
      <div className="habit-row__schedule">
        <span className="habit-row__badge">{tm(scheduleMsg(schedule))}</span>
        {pending && !archived && (
          <p className="habit-row__pending">
            {t('pendingChange', {
              schedule: tm(scheduleMsg(pending)),
              date: formatCalendarDate(pending.effectiveFrom, { day: 'numeric', month: 'short' }),
            })}
          </p>
        )}
      </div>
      {links.length > 0 && !archived && <OpenLinksButton links={links} name={name} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            ref={menuButton}
            type="button"
            aria-label={t('actionsFor', { name: name })}
            className="habit-row__menu"
          >
            <Ellipsis className="habit-row__menu-icon" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {archived ? (
            <>
              <DropdownMenuItem onSelect={onRestore}>{ta('restore')}</DropdownMenuItem>
              <DropdownMenuItem className="habit-row__delete" onSelect={onDelete}>
                {ta('delete')}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={onEdit}>{ta('edit')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onArchive}>{ta('archive')}</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
};
