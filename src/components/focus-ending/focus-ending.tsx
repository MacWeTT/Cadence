'use client';

import { useTranslations } from 'next-intl';
import type { FocusApi } from '@/components/focus-host/focus-context';
import { Button } from '@/components/ui/button';
import './focus-ending.css';

interface FocusEndingProps {
  result: NonNullable<FocusApi['result']>;
  didIt: boolean;
  onDidItChange: (didIt: boolean) => void;
  onDone: () => void;
}

/** The minutes focused, and an "I did it" box (ticked, on the assumption the work got done) for the day it started. */
export const FocusEnding = (props: FocusEndingProps) => {
  const { result, didIt, onDidItChange, onDone } = props;
  const { focusSeconds, ticked, name } = result;

  const t = useTranslations('focus.ending');

  const onCheckChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDidItChange(event.currentTarget.checked);
  };

  return (
    <div className="focus-ending">
      <p className="focus-ending__minutes">{t('focused', { minutes: Math.floor(focusSeconds / 60) })}</p>
      {ticked ? (
        <p className="focus-ending__note">{t('alreadyTicked', { name })}</p>
      ) : (
        <label className="focus-ending__check">
          <input type="checkbox" checked={didIt} onChange={onCheckChange} className="focus-ending__box" />
          <span>
            <span className="focus-ending__yes">{t('yes')}</span>
            <span className="focus-ending__note">{t('hint', { name })}</span>
          </span>
        </label>
      )}
      <Button onClick={onDone} className="focus-ending__done">
        {ticked ? t('close') : t('done')}
      </Button>
    </div>
  );
};
