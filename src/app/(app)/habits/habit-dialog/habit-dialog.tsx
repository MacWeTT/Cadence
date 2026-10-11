'use client';

import { useTranslations } from 'next-intl';
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
import { createHabitAction, updateHabitAction } from '@/app/(app)/habits/actions';
import { ColorPicker } from '@/app/(app)/habits/color-picker/color-picker';
import { EmojiField } from '@/app/(app)/habits/emoji-field/emoji-field';
import { FieldError } from '@/app/(app)/habits/field-error/field-error';
import { initialHabitForm, type HabitFormState } from '@/app/(app)/habits/habit-form';
import { ScheduleField } from '@/app/(app)/habits/schedule-field/schedule-field';
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

  const t = useTranslations('habits');
  const ta = useTranslations('common.actions');
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
    habit?.hasCompletions && scheduleChanged ? t('dialog.effectiveNote', { date: effectiveDate }) : null;

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
        toast.success(habit ? t('toasts.saved') : t('toasts.created'));
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

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Focus the name field here (not with autoFocus) so Radix remembers the opener and returns focus to it on close.
  const onOpenAutoFocus = (event: Event) => {
    event.preventDefault();
    nameRef.current?.focus();
  };

  const onIconChange = (icon: HabitFormState['icon']) => {
    setField('icon', icon);
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setField('name', event.target.value);
  };

  const onDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setField('description', event.target.value);
  };

  const onColorChange = (color: HabitFormState['color']) => {
    setField('color', color);
  };

  const onKindChange = (kind: HabitFormState['kind']) => {
    setField('kind', kind);
  };

  const onTimesPerWeekChange = (times: HabitFormState['timesPerWeek']) => {
    setField('timesPerWeek', times);
  };

  const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setField('startDate', event.target.value);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="habit-dialog" onCloseAutoFocus={onCloseAutoFocus} onOpenAutoFocus={onOpenAutoFocus}>
        <DialogHeader>
          <DialogTitle className="habit-dialog__title">
            {habit ? t('dialog.editTitle') : t('dialog.newTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('dialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="habit-dialog__form" noValidate>
          <div className="habit-dialog__top">
            <EmojiField value={form.icon} onChange={onIconChange} />
            <div className="habit-dialog__name">
              <Label htmlFor="habit-name" className="sr-only">
                {t('dialog.name')}
              </Label>
              <Input
                id="habit-name"
                aria-label={t('dialog.name')}
                placeholder={t('dialog.namePlaceholder')}
                value={form.name}
                onChange={onNameChange}
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
              {t('dialog.descriptionLabel')}
            </Label>
            <Textarea
              id="habit-description"
              value={form.description}
              onChange={onDescriptionChange}
              aria-invalid={Boolean(form.fieldErrors.description)}
              rows={2}
            />
            <FieldError field="description" message={form.fieldErrors.description} />
          </div>

          <div>
            <ColorPicker value={form.color} onChange={onColorChange} />
            <FieldError field="color" message={form.fieldErrors.color} />
          </div>

          <ScheduleField
            kind={form.kind}
            timesPerWeek={form.timesPerWeek}
            onKindChange={onKindChange}
            onTimesPerWeekChange={onTimesPerWeekChange}
            error={form.fieldErrors.timesPerWeek}
            note={effectiveNote}
          />

          <div>
            <Label htmlFor="habit-start" className="habit-dialog__label">
              {t('dialog.starts')}
            </Label>
            <Input
              id="habit-start"
              type="date"
              max={today}
              min="2000-01-01"
              value={form.startDate}
              onChange={onStartDateChange}
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
              {ta('cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {habit ? ta('save') : t('dialog.saveHabit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
