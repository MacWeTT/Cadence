'use client';

import { Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFocusApi, type FocusTarget } from '@/components/focus-host/focus-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import './focus-button.css';

interface FocusButtonProps {
  habit: FocusTarget;
}

/** A round stopwatch button on a habit row that opens the focus panel; its tooltip says "Focus". */
export const FocusButton = (props: FocusButtonProps) => {
  const { habit } = props;
  const { id, name } = habit;

  const t = useTranslations('focus.button');
  const { session, openFor } = useFocusApi();

  const running = session?.habitId === id;

  const onClick = () => {
    openFor(habit);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="focus-button"
          onClick={onClick}
          aria-label={t('aria', { name })}
          data-running={running || undefined}
        >
          <Timer aria-hidden className="focus-button__icon" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t('label')}</TooltipContent>
    </Tooltip>
  );
};
