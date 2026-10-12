'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { FocusTarget } from '@/components/focus-host/focus-context';
import type { StartInput } from '@/components/focus-host/use-focus';
import { FocusSound } from '@/components/focus-sound/focus-sound';
import { Button } from '@/components/ui/button';
import { PRESETS, planErrors, totalSeconds, type FocusPlan, type PlanField } from '@/domain/focus';
import { cn } from '@/lib/utils';
import './focus-setup.css';

interface FocusSetupProps {
  target: FocusTarget;
  /** The numbers last used on this habit, if any. */
  last: FocusPlan | undefined;
  /** The sound last chosen on this habit, if any (otherwise the profile sound is the default). */
  lastSound: string | undefined;
  pending: boolean;
  error: string | null;
  onStart: (input: StartInput) => void;
}

type PresetKey = keyof typeof PRESETS;

const FIELDS: PlanField[] = ['focusMin', 'breakMin', 'longBreakMin', 'rounds'];
const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

const presetOf = (plan: FocusPlan): PresetKey | null => {
  return (
    PRESET_KEYS.find(key => {
      return FIELDS.every(field => {
        return PRESETS[key][field] === plan[field];
      });
    }) ?? null
  );
};

/** Pomodoro (Classic, Deep, Short or your own numbers) or Free. Remembers the last numbers used on the habit. */
export const FocusSetup = (props: FocusSetupProps) => {
  const { target, last, lastSound, pending, error, onStart } = props;
  const { id } = target;

  const [state, setState] = useState<{ mode: 'pomodoro' | 'free'; plan: FocusPlan; soundId: string | null }>({
    mode: 'pomodoro',
    plan: last ?? PRESETS.classic,
    soundId: lastSound ?? null,
  });

  const t = useTranslations('focus.setup');

  const { mode, plan, soundId } = state;
  const invalid = planErrors(plan).length > 0;
  const pomodoro = mode === 'pomodoro';
  const total = totalSeconds(plan) / 60;
  const { focusMin, rounds } = plan;
  const focus = focusMin * rounds;
  const duration =
    total >= 60 ? t('hours', { count: Math.round(total / 30) / 2 }) : t('minutes', { count: Math.round(total) });

  const onModeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // read before the updater runs: React clears currentTarget once the handler returns
    const mode = event.currentTarget.value as 'pomodoro' | 'free';

    setState(current => {
      return { ...current, mode };
    });
  };

  const onPresetClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const preset = PRESETS[event.currentTarget.value as PresetKey];

    setState(current => {
      return { ...current, plan: { ...preset } };
    });
  };

  const onFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, valueAsNumber } = event.currentTarget;

    setState(current => {
      return { ...current, plan: { ...current.plan, [name]: valueAsNumber } };
    });
  };

  const onSoundChange = (next: string | null) => {
    setState(current => {
      return { ...current, soundId: next };
    });
  };

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart({ habitId: id, mode, plan: pomodoro ? plan : null, soundId });
  };

  return (
    <form className="focus-setup" onSubmit={onSubmit} noValidate>
      <div role="radiogroup" aria-label={t('mode')} className="focus-setup__modes">
        {(['pomodoro', 'free'] as const).map(key => {
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={mode === key}
              value={key}
              onClick={onModeClick}
              className={cn('focus-setup__mode', mode === key && 'focus-setup__mode--on')}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
      {pomodoro ? (
        <>
          <div role="radiogroup" aria-label={t('preset')} className="focus-setup__presets">
            {PRESET_KEYS.map(key => {
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={presetOf(plan) === key}
                  value={key}
                  onClick={onPresetClick}
                  className={cn('focus-setup__chip', presetOf(plan) === key && 'focus-setup__chip--on')}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>
          <div className="focus-setup__fields">
            {FIELDS.map(field => {
              return (
                <label key={field} className="focus-setup__field">
                  <span>{t(field)}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    name={field}
                    value={Number.isNaN(plan[field]) ? '' : plan[field]}
                    onChange={onFieldChange}
                    className="focus-setup__input"
                  />
                </label>
              );
            })}
          </div>
          <p className="focus-setup__total" role={invalid ? 'alert' : undefined}>
            {invalid ? t('invalid') : t('total', { duration, focus })}
          </p>
        </>
      ) : (
        <p className="focus-setup__total">{t('freeNote')}</p>
      )}
      <FocusSound value={soundId} onChange={onSoundChange} />
      {error && (
        <p role="alert" className="focus-setup__error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || (pomodoro && invalid)} className="focus-setup__start">
        {t('start')}
      </Button>
    </form>
  );
};
