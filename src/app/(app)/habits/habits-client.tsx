'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { toCalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import type { HabitListItem } from '@/server/habit-view';
import type { HabitsView } from '@/server/habits';
import { archiveHabitAction, restoreHabitAction, type ActionResult } from './actions';
import { DeleteHabitDialog } from './delete-dialog';
import { HabitDialog } from './habit-dialog';
import { HabitRow, type HabitRowActions } from './habit-row';

export function HabitsClient({ view }: { view: HabitsView }) {
  // `dialog` is null when closed, `{}` to create, `{ habit }` to edit.
  const [dialog, setDialog] = useState<{ habit?: HabitListItem } | null>(null);
  const [deleting, setDeleting] = useState<HabitListItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [, startTransition] = useTransition();
  const opener = useRef<HTMLElement | null>(null);
  const { active, archived, profile } = view;

  const openDialog = (habit?: HabitListItem, from?: HTMLElement | null) => {
    opener.current = from ?? (document.activeElement as HTMLElement | null);
    setDialog({ habit });
  };

  function run(action: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error);
    });
  }

  const actions: HabitRowActions = {
    onEdit: (habit, from) => openDialog(habit, from),
    onArchive: habit => run(() => archiveHabitAction(habit.id), 'Habit archived'),
    onRestore: habit => run(() => restoreHabitAction(habit.id), 'Habit restored'),
    onDelete: (habit, from) => {
      opener.current = from;
      setDeleting(habit);
    },
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-4xl">Habits</h1>
        <Button onClick={() => openDialog()}>New habit</Button>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <h2 className="font-display text-2xl">No habits yet</h2>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-ink-muted">
            Start with one small habit you can do every day. You can add more whenever you like.
          </p>
          <Button onClick={() => openDialog()}>New habit</Button>
        </div>
      ) : (
        <ul aria-label="Habits">
          {active.map(habit => (
            <HabitRow key={habit.id} habit={habit} actions={actions} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="mt-10">
          <button
            type="button"
            aria-expanded={showArchived}
            onClick={() => setShowArchived(v => !v)}
            className="flex items-center gap-2 rounded-md text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-clay"
          >
            <span aria-hidden>{showArchived ? '▾' : '▸'}</span>
            {`Archived (${archived.length})`}
          </button>
          {showArchived && (
            <ul aria-label="Archived habits" className="mt-2">
              {archived.map(habit => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  archivedOn={formatCalendarDate(toCalendarDate(habit.archivedAt ?? '', profile.timezone))}
                  actions={actions}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {dialog && (
        <HabitDialog
          // A fresh form for each habit (or for create).
          key={dialog.habit?.id ?? 'new'}
          habit={dialog.habit}
          today={profile.today}
          weekStartsOn={profile.weekStartsOn}
          onClose={() => setDialog(null)}
          onCloseAutoFocus={e => {
            e.preventDefault();
            opener.current?.focus();
          }}
        />
      )}
      {deleting && (
        <DeleteHabitDialog
          habit={deleting}
          onClose={() => setDeleting(null)}
          onCloseAutoFocus={e => {
            e.preventDefault();
            opener.current?.focus();
          }}
        />
      )}
    </>
  );
}
