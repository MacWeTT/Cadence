'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import { toCalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import type { HabitListItem } from '@/server/habit-view';
import type { HabitsView } from '@/server/habits';
import { archiveHabitAction, restoreHabitAction, type ActionResult } from '../actions';
import { DeleteHabitDialog } from '../delete-dialog/delete-dialog';
import { HabitDialog } from '../habit-dialog/habit-dialog';
import { HabitRow, type HabitRowActions } from '../habit-row/habit-row';
import './habits-client.css';

interface HabitsClientProps {
  view: HabitsView;
}

interface HabitsState {
  /** `null` when closed, `{}` to create, `{ habit }` to edit. */
  dialog: { habit?: HabitListItem } | null;
  deleting: HabitListItem | null;
  showArchived: boolean;
}

export const HabitsClient = (props: HabitsClientProps) => {
  const { view } = props;

  const [state, setState] = useState<HabitsState>({ dialog: null, deleting: null, showArchived: false });

  const t = useTranslations('habits');
  const ta = useTranslations('common.actions');
  const [, startTransition] = useTransition();
  const opener = useRef<HTMLElement | null>(null);

  const { active, archived, profile } = view;

  const setField = <K extends keyof HabitsState>(field: K, value: HabitsState[K]) => {
    setState(current => {
      return { ...current, [field]: value };
    });
  };

  const openDialog = (habit?: HabitListItem, from?: HTMLElement | null) => {
    opener.current = from ?? (document.activeElement as HTMLElement | null);
    setField('dialog', { habit });
  };

  const run = (action: () => Promise<ActionResult>, success: string) => {
    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        toast.success(success);
      } else {
        toast.error(result.error);
      }
    });
  };

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    opener.current?.focus();
  };

  const actions: HabitRowActions = {
    onEdit: (habit, from) => {
      return openDialog(habit, from);
    },
    onArchive: habit => {
      return run(() => {
        return archiveHabitAction(habit.id);
      }, t('toasts.archived'));
    },
    onRestore: habit => {
      return run(() => {
        return restoreHabitAction(habit.id);
      }, t('toasts.restored'));
    },
    onDelete: (habit, from) => {
      opener.current = from;
      setField('deleting', habit);
    },
  };

  return (
    <>
      <div className="habits__header">
        <h1 className="habits__title">{t('title')}</h1>
        <Button
          onClick={() => {
            return openDialog();
          }}
        >
          {ta('newHabit')}
        </Button>
      </div>

      {active.length === 0 ? (
        <EmptyState
          flush
          title={t('emptyTitle')}
          text={t('emptyText')}
          action={
            <Button
              onClick={() => {
                return openDialog();
              }}
            >
              {ta('newHabit')}
            </Button>
          }
        />
      ) : (
        <ul aria-label={t('listLabel')}>
          {active.map(habit => {
            return <HabitRow key={habit.id} habit={habit} actions={actions} />;
          })}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="habits__archived">
          <button
            type="button"
            aria-expanded={state.showArchived}
            onClick={() => {
              return setField('showArchived', !state.showArchived);
            }}
            className="habits__toggle"
          >
            <span aria-hidden>{state.showArchived ? '▾' : '▸'}</span>
            {t('archivedToggle', { count: archived.length })}
          </button>
          {state.showArchived && (
            <ul aria-label={t('archivedLabel')} className="habits__archived-list">
              {archived.map(habit => {
                return (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    archivedOn={formatCalendarDate(toCalendarDate(habit.archivedAt ?? '', profile.timezone))}
                    actions={actions}
                  />
                );
              })}
            </ul>
          )}
        </section>
      )}

      {state.dialog && (
        <HabitDialog
          // A fresh form for each habit (or for create).
          key={state.dialog.habit?.id ?? 'new'}
          habit={state.dialog.habit}
          today={profile.today}
          weekStartsOn={profile.weekStartsOn}
          onClose={() => {
            return setField('dialog', null);
          }}
          onCloseAutoFocus={restoreFocus}
        />
      )}
      {state.deleting && (
        <DeleteHabitDialog
          habit={state.deleting}
          onClose={() => {
            return setField('deleting', null);
          }}
          onCloseAutoFocus={restoreFocus}
        />
      )}
    </>
  );
};
