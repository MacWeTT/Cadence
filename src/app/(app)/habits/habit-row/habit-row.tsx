'use client';

import { Ellipsis } from 'lucide-react';
import { useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCalendarDate } from '@/lib/format';
import { habitColor } from '@/lib/palette';
import { scheduleLabel } from '@/lib/schedule-label';
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

  const menuButton = useRef<HTMLButtonElement>(null);

  const pending = habit.pendingSchedule;
  const archived = archivedOn !== undefined;

  return (
    <li className={cn('habit-row', archived && 'habit-row--archived')}>
      <span
        aria-hidden
        className="habit-row__icon"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(habit.color)} 22%, var(--surface))` }}
      >
        {habit.icon}
      </span>
      <div className="habit-row__body">
        <p className="habit-row__name">{habit.name}</p>
        {archived ? (
          <p className="habit-row__note">{`Archived ${archivedOn}`}</p>
        ) : (
          habit.description && <p className="habit-row__note">{habit.description}</p>
        )}
      </div>
      <div className="habit-row__schedule">
        <span className="habit-row__badge">{scheduleLabel(habit.schedule)}</span>
        {pending && !archived && (
          <p className="habit-row__pending">
            {`Changes to ${scheduleLabel(pending)} on ${formatCalendarDate(pending.effectiveFrom, { day: 'numeric', month: 'short' })}`}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button ref={menuButton} type="button" aria-label={`Actions for ${habit.name}`} className="habit-row__menu">
            <Ellipsis className="habit-row__menu-icon" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {archived ? (
            <>
              <DropdownMenuItem
                onSelect={() => {
                  return actions.onRestore(habit);
                }}
              >
                Restore
              </DropdownMenuItem>
              <DropdownMenuItem
                className="habit-row__delete"
                onSelect={() => {
                  return actions.onDelete(habit, menuButton.current);
                }}
              >
                Delete
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onSelect={() => {
                  return actions.onEdit(habit, menuButton.current);
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  return actions.onArchive(habit);
                }}
              >
                Archive
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
};
