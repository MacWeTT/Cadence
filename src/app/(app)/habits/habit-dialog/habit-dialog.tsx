'use client';

import { useQueryClient } from '@tanstack/react-query';
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
import { dataSource } from '@/data';
import { ColorPicker } from '@/app/(app)/habits/color-picker/color-picker';
import { EmojiField } from '@/app/(app)/habits/emoji-field/emoji-field';
import { FieldError } from '@/app/(app)/habits/field-error/field-error';
import { habitInput, initialHabitForm, scheduleChanged, type HabitFormState } from '@/app/(app)/habits/habit-form';
import { LinksField } from '@/app/(app)/habits/links-field/links-field';
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

  const queryClient = useQueryClient();
  const t = useTranslations('habits');
  const ta = useTranslations('common.actions');
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false); // guards against a double-click before React re-renders the disabled button

  const { name, description, icon, color, kind, timesPerWeek, weekdays, links, startDate, fieldErrors, formError } =
    form;
  const {
    name: nameError,
    icon: iconError,
    description: descriptionError,
    color: colorError,
    timesPerWeek: timesError,
    weekdays: daysError,
    links: linksError,
    startDate: startDateError,
  } = fieldErrors;

  const setField = <K extends keyof HabitFormState>(field: K, value: HabitFormState[K]) => {
    setForm(current => {
      return { ...current, [field]: value };
    });
  };

  // A habit with ticks keeps its history, so a schedule change only applies from next week.
  const effectiveDate = formatCalendarDate(nextEditDate(today, weekStartsOn), { dateStyle: 'full' });
  const effectiveNote =
    habit?.hasCompletions && scheduleChanged(habit, form) ? t('dialog.effectiveNote', { date: effectiveDate }) : null;

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
      const input = habitInput(form);
      const result = habit ? await dataSource.updateHabit(habit.id, input) : await dataSource.createHabit(input);

      if (result.ok) {
        toast.success(habit ? t('toasts.saved') : t('toasts.created'));
        void queryClient.invalidateQueries();
        onClose();

        return;
      }

      const { fieldErrors: serverErrors, error } = result;

      submitting.current = false;
      setForm(state => {
        return {
          ...state,
          fieldErrors: serverErrors ?? {},
          formError: serverErrors ? null : error,
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

  const onWeekdaysChange = (days: HabitFormState['weekdays']) => {
    setField('weekdays', days);
  };

  const onLinksChange = (links: HabitFormState['links']) => {
    setField('links', links);
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
            <EmojiField value={icon} onChange={onIconChange} />
            <div className="habit-dialog__name">
              <Label htmlFor="habit-name" className="sr-only">
                {t('dialog.name')}
              </Label>
              <Input
                id="habit-name"
                aria-label={t('dialog.name')}
                placeholder={t('dialog.namePlaceholder')}
                value={name}
                onChange={onNameChange}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'error-name' : undefined}
                ref={nameRef}
                className="habit-dialog__name-input"
              />
              <FieldError field="name" message={nameError} />
              <FieldError field="icon" message={iconError} />
            </div>
          </div>

          <div>
            <Label htmlFor="habit-description" className="habit-dialog__label">
              {t('dialog.descriptionLabel')}
            </Label>
            <Textarea
              id="habit-description"
              value={description}
              onChange={onDescriptionChange}
              aria-invalid={Boolean(descriptionError)}
              rows={2}
            />
            <FieldError field="description" message={descriptionError} />
          </div>

          <div>
            <ColorPicker value={color} onChange={onColorChange} />
            <FieldError field="color" message={colorError} />
          </div>

          <ScheduleField
            kind={kind}
            timesPerWeek={timesPerWeek}
            weekdays={weekdays}
            onKindChange={onKindChange}
            onTimesPerWeekChange={onTimesPerWeekChange}
            onWeekdaysChange={onWeekdaysChange}
            error={timesError}
            daysError={daysError}
            note={effectiveNote}
          />

          <LinksField links={links} onChange={onLinksChange} error={linksError} />

          <div>
            <Label htmlFor="habit-start" className="habit-dialog__label">
              {t('dialog.starts')}
            </Label>
            <Input
              id="habit-start"
              type="date"
              max={today}
              min="2000-01-01"
              value={startDate}
              onChange={onStartDateChange}
              aria-invalid={Boolean(startDateError)}
              className="habit-dialog__date"
            />
            <FieldError field="startDate" message={startDateError} />
          </div>

          {formError && (
            <p role="alert" className="habit-dialog__error">
              {formError}
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
