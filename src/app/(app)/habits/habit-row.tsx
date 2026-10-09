"use client";

import { Ellipsis } from "lucide-react";
import { useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCalendarDate } from "@/lib/format";
import { habitColor } from "@/lib/palette";
import { scheduleLabel } from "@/lib/schedule-label";
import type { HabitListItem } from "@/server/habit-view";

export interface HabitRowActions {
  /** Called with the menu button, so focus can return to it when the dialog closes. */
  onEdit: (habit: HabitListItem, opener: HTMLElement | null) => void;
  onArchive: (habit: HabitListItem) => void;
  onRestore: (habit: HabitListItem) => void;
  onDelete: (habit: HabitListItem) => void;
}

export function HabitRow({
  habit,
  archivedOn,
  actions,
}: {
  habit: HabitListItem;
  /** A readable archive date. Present only for archived habits. */
  archivedOn?: string;
  actions: HabitRowActions;
}) {
  const menuButton = useRef<HTMLButtonElement>(null);
  const pending = habit.pendingSchedule;
  const archived = archivedOn !== undefined;

  return (
    <li className={`flex items-center gap-4 border-b border-line px-3 py-4 ${archived ? "opacity-75" : ""}`}>
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(habit.color)} 22%, var(--surface))` }}
      >
        {habit.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{habit.name}</p>
        {archived ? (
          <p className="truncate text-sm text-ink-muted">{`Archived ${archivedOn}`}</p>
        ) : (
          habit.description && <p className="truncate text-sm text-ink-muted">{habit.description}</p>
        )}
      </div>
      <div className="text-right">
        <span className="rounded-full border border-line px-3 py-0.5 text-sm text-ink-muted">
          {scheduleLabel(habit.schedule)}
        </span>
        {pending && !archived && (
          <p className="mt-1 text-xs text-ink-muted">
            {`Changes to ${scheduleLabel(pending)} on ${formatCalendarDate(pending.effectiveFrom, { day: "numeric", month: "short" })}`}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            ref={menuButton}
            type="button"
            aria-label={`Actions for ${habit.name}`}
            className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-clay"
          >
            <Ellipsis className="size-5" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {archived ? (
            <>
              <DropdownMenuItem onSelect={() => actions.onRestore(habit)}>Restore</DropdownMenuItem>
              <DropdownMenuItem className="text-clay" onSelect={() => actions.onDelete(habit)}>
                Delete
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => actions.onEdit(habit, menuButton.current)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onArchive(habit)}>Archive</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
