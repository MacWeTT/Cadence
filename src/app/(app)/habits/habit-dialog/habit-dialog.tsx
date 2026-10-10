'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WeekStart } from '@/domain/dates';
import { nextEditDate } from '@/domain/schedule';
import { formatCalendarDate } from '@/lib/format';
import type { HabitListItem } from '@/server/habit-view';
import { createHabitAction, updateHabitAction } from '../actions';
import { ColorPicker } from '../color-picker/color-picker';
import { EmojiField } from '../emoji-field/emoji-field';
import { FieldError } from '../field-error/field-error';
import { initialHabitForm, type HabitFormState } from '../habit-form';
import { ScheduleField } from '../schedule-field/schedule-field';
import './habit-dialog.css';

interface HabitDialogProps {
  /** The habit being edited, or undefined to create a new one. */
  habit?: HabitListItem;
  today: string;
  weekStartsOn: WeekStart;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

export const HabitDialog = (props: HabitDialogProps) => {
  const { habit, today, weekStartsOn, onClose, onCloseAutoFocus } = props;

  const [form, setForm] = useState<HabitFormState>(() => {
    return initialHabitForm(habit, today);
  });

  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false); // guards against a double-click before React re-renders the disabled button

  const setField = <K extends keyof HabitFormState>(field: K, value: HabitFormState[K]) => {
    setForm(current => {
      return { ...current, [field]: value };
    });
  };

  // A habit with ticks keeps its history, so a schedule change only applies from next week.
  const current = habit?.schedule;
  const scheduleChanged =
    current !== undefined &&
    (form.kind !== current.kind ||
      (current.kind === 'weekly_count' && Number(form.timesPerWeek) !== current.timesPerWeek));
  const effectiveDate = formatCalendarDate(nextEditDate(today, weekStartsOn), { dateStyle: 'full' });
  const effectiveNote =
    habit?.hasCompletions && scheduleChanged
      ? `Changes apply from ${effectiveDate}, so your history stays as it was.`
      : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (submitting.current) {
      return;
    }

    submitting.current = true;
    setForm(state => {
      return { ...state, fieldErrors: {}, formError: null };
    });

    startTransition(async () => {
      const input = {
        name: form.name,
        description: form.description || undefined,
        icon: form.icon,
        color: form.color,
        kind: form.kind,
        timesPerWeek: form.kind === 'weekly_count' ? Number(form.timesPerWeek) : undefined,
        startDate: form.startDate,
      };
      const result = habit ? await updateHabitAction(habit.id, input) : await createHabitAction(input);

      if (result.ok) {
        toast.success(habit ? 'Habit saved' : 'Habit created');
        onClose();

        return;
      }

      submitting.current = false;
      setForm(state => {
        return {
          ...state,
          fieldErrors: result.fieldErrors ?? {},
          formError: result.fieldErrors ? null : result.error,
        };
      });
    });
  };

  return (
    <Dialog
      open
      onOpenChange={open => {
        return !open && onClose();
      }}
    >
      <DialogContent
        className="habit-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
        // Focus the name field here (not with autoFocus) so Radix remembers the opener and returns focus to it on close.
        onOpenAutoFocus={e => {
          e.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="habit-dialog__title">{habit ? 'Edit habit' : 'New habit'}</DialogTitle>
          <DialogDescription className="sr-only">Choose an emoji, a name, a color and a schedule.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="habit-dialog__form" noValidate>
          <div className="habit-dialog__top">
            <EmojiField
              value={form.icon}
              onChange={icon => {
                return setField('icon', icon);
              }}
            />
            <div className="habit-dialog__name">
              <Label htmlFor="habit-name" className="sr-only">
                Name
              </Label>
              <Input
                id="habit-name"
                aria-label="Name"
                placeholder="Name your habit"
                value={form.name}
                onChange={e => {
                  return setField('name', e.target.value);
                }}
                aria-invalid={Boolean(form.fieldErrors.name)}
                aria-describedby={form.fieldErrors.name ? 'error-name' : undefined}
                ref={nameRef}
                className="habit-dialog__name-input"
              />
              <FieldError field="name" message={form.fieldErrors.name} />
              <FieldError field="icon" message={form.fieldErrors.icon} />
            </div>
          </div>

          <div>
            <Label htmlFor="habit-description" className="habit-dialog__label">
              Description (optional)
            </Label>
            <Textarea
              id="habit-description"
              value={form.description}
              onChange={e => {
                return setField('description', e.target.value);
              }}
              aria-invalid={Boolean(form.fieldErrors.description)}
              rows={2}
            />
            <FieldError field="description" message={form.fieldErrors.description} />
          </div>

          <div>
            <ColorPicker
              value={form.color}
              onChange={color => {
                return setField('color', color);
              }}
            />
            <FieldError field="color" message={form.fieldErrors.color} />
          </div>

          <ScheduleField
            kind={form.kind}
            timesPerWeek={form.timesPerWeek}
            onKindChange={kind => {
              return setField('kind', kind);
            }}
            onTimesPerWeekChange={times => {
              return setField('timesPerWeek', times);
            }}
            error={form.fieldErrors.timesPerWeek}
            note={effectiveNote}
          />

          <div>
            <Label htmlFor="habit-start" className="habit-dialog__label">
              Starts
            </Label>
            <Input
              id="habit-start"
              type="date"
              max={today}
              min="2000-01-01"
              value={form.startDate}
              onChange={e => {
                return setField('startDate', e.target.value);
              }}
              aria-invalid={Boolean(form.fieldErrors.startDate)}
              className="habit-dialog__date"
            />
            <FieldError field="startDate" message={form.fieldErrors.startDate} />
          </div>

          {form.formError && (
            <p role="alert" className="habit-dialog__error">
              {form.formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {habit ? 'Save' : 'Save habit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
