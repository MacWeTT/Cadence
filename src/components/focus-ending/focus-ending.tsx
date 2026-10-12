'use client';

import { useTranslations } from 'next-intl';
import type { FocusApi } from '@/components/focus-host/focus-context';
import { Button } from '@/components/ui/button';
import './focus-ending.css';

interface FocusEndingProps {
  result: NonNullable<FocusApi['result']>;
  onConfirm: (didIt: boolean) => void;
}

/** The minutes focused, and "I did it" to tick the habit for the day the session started. */
export const FocusEnding = (props: FocusEndingProps) => {
  const { result, onConfirm } = props;
  const { focusSeconds, ticked, name } = result;

  const t = useTranslations('focus.ending');

  const onYes = () => {
    onConfirm(true);
  };

  const onNo = () => {
    onConfirm(false);
  };

  return (
    <div className="focus-ending">
      <p className="focus-ending__minutes">{t('focused', { minutes: Math.floor(focusSeconds / 60) })}</p>
      {ticked ? (
        <>
          <p className="focus-ending__note">{t('alreadyTicked', { name })}</p>
          <Button onClick={onNo}>{t('close')}</Button>
        </>
      ) : (
        <>
          <p className="focus-ending__note">{t('ask')}</p>
          <div className="focus-ending__actions">
            <Button onClick={onYes}>{t('yes')}</Button>
            <Button variant="outline" onClick={onNo}>
              {t('no')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
