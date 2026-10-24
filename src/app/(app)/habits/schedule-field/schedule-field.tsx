import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { weekdayLabel } from '@/lib/format';
import { FieldError } from '@/app/(app)/habits/field-error/field-error';
import './schedule-field.css';
import { Tip } from '@/components/tip/tip';

export type ScheduleKind = 'daily' | 'weekdays' | 'weekly_count' | 'optional';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

interface ScheduleFieldProps {
  kind: ScheduleKind;
  timesPerWeek: string;
  /** For fixed days: 1 = Monday ... 7 = Sunday. */
  weekdays: number[];
  onKindChange: (kind: ScheduleKind) => void;
  onTimesPerWeekChange: (times: string) => void;
  onWeekdaysChange: (days: number[]) => void;
  error?: string;
  daysError?: string;
  /** A hint shown under the field, e.g. when a change will only apply from next week. */
  note?: string | null;
}

/** Every day, certain days (with a chip per day), N times a week (with a number), or whenever you like. */
export const ScheduleField = (props: ScheduleFieldProps) => {
  const { kind, timesPerWeek, weekdays, onKindChange, onTimesPerWeekChange, onWeekdaysChange, error, daysError, note } =
    props;

  const t = useTranslations('habits.dialog');

  const onValueChange = (value: string) => {
    if (value) {
      onKindChange(value as ScheduleKind);
    }
  };

  const onDaysChange = (values: string[]) => {
    onWeekdaysChange(values.map(Number).sort());
  };

  const onTimesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onTimesPerWeekChange(event.target.value);
  };

  return (
    <div>
      <p className="schedule-field__label" id="schedule-label">
        {t('schedule')}
      </p>
      <div className="schedule-field__row">
        <ToggleGroup
          type="single"
          variant="outline"
          value={kind}
          onValueChange={onValueChange}
          aria-labelledby="schedule-label"
          className="schedule-field__kinds"
        >
          <ToggleGroupItem value="daily" className="schedule-field__option">
            {t('everyDay')}
          </ToggleGroupItem>
          <ToggleGroupItem value="weekdays" className="schedule-field__option">
            {t('certainDays')}
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly_count" className="schedule-field__option">
            {t('timesAWeek')}
          </ToggleGroupItem>
          <ToggleGroupItem value="optional" className="schedule-field__option">
            {t('whenever')}
          </ToggleGroupItem>
        </ToggleGroup>
        {kind === 'weekly_count' && (
          <div className="schedule-field__times">
            <Label htmlFor="habit-times" className="sr-only">
              {t('timesPerWeek')}
            </Label>
            <Input
              id="habit-times"
              type="number"
              min={1}
              max={6}
              value={timesPerWeek}
              onChange={onTimesChange}
              aria-invalid={Boolean(error)}
              className="schedule-field__times-input"
            />
            <span className="schedule-field__suffix">{t('perWeek')}</span>
          </div>
        )}
      </div>
      {kind === 'weekdays' && (
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={weekdays.map(String)}
          onValueChange={onDaysChange}
          aria-label={t('daysOfWeek')}
          className="schedule-field__days"
        >
          {ALL_DAYS.map(day => {
            return (
              <Tip key={day} label={weekdayLabel(day, 'long')}>
                <ToggleGroupItem
                  value={String(day)}
                  aria-label={weekdayLabel(day, 'long')}
                  className="schedule-field__option"
                >
                  {weekdayLabel(day)}
                </ToggleGroupItem>
              </Tip>
            );
          })}
        </ToggleGroup>
      )}
      {kind === 'optional' && <p className="schedule-field__note">{t('wheneverHint')}</p>}
      <FieldError field="timesPerWeek" message={error} />
      <FieldError field="weekdays" message={daysError} />
      {note && <p className="schedule-field__note">{note}</p>}
    </div>
  );
};
