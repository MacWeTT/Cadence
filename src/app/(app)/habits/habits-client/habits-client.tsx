'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import { toCalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import type { HabitListItem } from '@/server/habit-view';
import { useArchiveHabit, useHabitsView, useRestoreHabit } from '@/app/(app)/habits/use-habits';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { DeleteHabitDialog } from '@/app/(app)/habits/delete-dialog/delete-dialog';
import { HabitDialog } from '@/app/(app)/habits/habit-dialog/habit-dialog';
import { HabitRow, type HabitRowActions } from '@/app/(app)/habits/habit-row/habit-row';
import './habits-client.css';

interface HabitsState {
  /** `null` when closed, `{}` to create, `{ habit }` to edit. */
  dialog: { habit?: HabitListItem } | null;
  deleting: HabitListItem | null;
  showArchived: boolean;
}

export const HabitsClient = () => {
  const [state, setState] = useState<HabitsState>({ dialog: null, deleting: null, showArchived: false });

  const t = useTranslations('habits');
  const ta = useTranslations('common.actions');
  const { data: view, isError, refetch } = useHabitsView();
  const archive = useArchiveHabit();
  const restore = useRestoreHabit();
  const opener = useRef<HTMLElement | null>(null);

  const { dialog, deleting, showArchived } = state;
  const editing = dialog?.habit;

  const setField = <K extends keyof HabitsState>(field: K, value: HabitsState[K]) => {
    setState(current => {
      return { ...current, [field]: value };
    });
  };

  const openDialog = (habit?: HabitListItem, from?: HTMLElement | null) => {
    opener.current = from ?? (document.activeElement as HTMLElement | null);
    setField('dialog', { habit });
  };

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    opener.current?.focus();
  };

  const onHabitEdit = (habit: HabitListItem, from: HTMLElement | null) => {
    openDialog(habit, from);
  };

  const onHabitArchive = (habit: HabitListItem) => {
    archive.mutate(habit.id);
  };

  const onHabitRestore = (habit: HabitListItem) => {
    restore.mutate(habit.id);
  };

  const onHabitDelete = (habit: HabitListItem, from: HTMLElement | null) => {
    opener.current = from;
    setField('deleting', habit);
  };

  const onNewHabit = () => {
    openDialog();
  };

  const onArchivedToggle = () => {
    setField('showArchived', !showArchived);
  };

  const onDialogClose = () => {
    setField('dialog', null);
  };

  const onDeleteClose = () => {
    setField('deleting', null);
  };

  const actions: HabitRowActions = {
    onEdit: onHabitEdit,
    onArchive: onHabitArchive,
    onRestore: onHabitRestore,
    onDelete: onHabitDelete,
  };

  const onRetry = () => {
    void refetch();
  };

  if (!view) {
    return isError ? (
      <EmptyState
        flush
        title={t('loadFailedTitle')}
        text={t('loadFailedText')}
        action={<Button onClick={onRetry}>{t('retry')}</Button>}
      />
    ) : (
      <ListSkeleton title={t('title')} />
    );
  }

  const {
    active,
    archived,
    profile: { today, weekStartsOn, timezone },
  } = view;
  const archivedCount = archived.length;

  return (
    <>
      <div className="habits__header">
        <h1 className="habits__title">{t('title')}</h1>
        <Button onClick={onNewHabit}>{ta('newHabit')}</Button>
      </div>
      {active.length === 0 ? (
        <EmptyState
          flush
          title={t('emptyTitle')}
          text={t('emptyText')}
          action={<Button onClick={onNewHabit}>{ta('newHabit')}</Button>}
        />
      ) : (
        <ul aria-label={t('listLabel')}>
          {active.map(habit => {
            return <HabitRow key={habit.id} habit={habit} actions={actions} />;
          })}
        </ul>
      )}

      {archivedCount > 0 && (
        <section className="habits__archived">
          <button type="button" aria-expanded={showArchived} onClick={onArchivedToggle} className="habits__toggle">
            <span aria-hidden>{showArchived ? '▾' : '▸'}</span>
            {t('archivedToggle', { count: archivedCount })}
          </button>
          {showArchived && (
            <ul aria-label={t('archivedLabel')} className="habits__archived-list">
              {archived.map(habit => {
                const { id, archivedAt } = habit;

                return (
                  <HabitRow
                    key={id}
                    habit={habit}
                    archivedOn={formatCalendarDate(toCalendarDate(archivedAt ?? '', timezone))}
                    actions={actions}
                  />
                );
              })}
            </ul>
          )}
        </section>
      )}

      {dialog && (
        <HabitDialog
          // A fresh form for each habit (or for create).
          key={editing?.id ?? 'new'}
          habit={editing}
          today={today}
          weekStartsOn={weekStartsOn}
          onClose={onDialogClose}
          onCloseAutoFocus={restoreFocus}
        />
      )}
      {deleting && <DeleteHabitDialog habit={deleting} onClose={onDeleteClose} onCloseAutoFocus={restoreFocus} />}
    </>
  );
};
