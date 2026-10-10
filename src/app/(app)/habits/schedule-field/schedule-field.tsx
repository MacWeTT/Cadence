import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FieldError } from '../field-error/field-error';
import './schedule-field.css';

export type ScheduleKind = 'daily' | 'weekly_count';

interface ScheduleFieldProps {
  kind: ScheduleKind;
  timesPerWeek: string;
  onKindChange: (kind: ScheduleKind) => void;
  onTimesPerWeekChange: (times: string) => void;
  error?: string;
  /** A hint shown under the field, e.g. when a change will only apply from next week. */
  note?: string | null;
}

/** "Every day" or "N times a week", with the number input for the second. */
export const ScheduleField = (props: ScheduleFieldProps) => {
  const { kind, timesPerWeek, onKindChange, onTimesPerWeekChange, error, note } = props;

  return (
    <div>
      <p className="schedule-field__label" id="schedule-label">
        Schedule
      </p>
      <div className="schedule-field__row">
        <ToggleGroup
          type="single"
          variant="outline"
          value={kind}
          onValueChange={value => {
            return value && onKindChange(value as ScheduleKind);
          }}
          aria-labelledby="schedule-label"
        >
          <ToggleGroupItem value="daily" className="schedule-field__option">
            Every day
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly_count" className="schedule-field__option">
            Times a week
          </ToggleGroupItem>
        </ToggleGroup>
        {kind === 'weekly_count' && (
          <div className="schedule-field__times">
            <Label htmlFor="habit-times" className="sr-only">
              Times per week
            </Label>
            <Input
              id="habit-times"
              type="number"
              min={1}
              max={6}
              value={timesPerWeek}
              onChange={e => {
                return onTimesPerWeekChange(e.target.value);
              }}
              aria-invalid={Boolean(error)}
              className="schedule-field__times-input"
            />
            <span className="schedule-field__suffix">per week</span>
          </div>
        )}
      </div>
      <FieldError field="timesPerWeek" message={error} />
      {note && <p className="schedule-field__note">{note}</p>}
    </div>
  );
};
