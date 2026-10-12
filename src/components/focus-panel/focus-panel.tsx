'use client';

import { useTranslations } from 'next-intl';
import { FocusEnding } from '@/components/focus-ending/focus-ending';
import { useFocusApi } from '@/components/focus-host/focus-context';
import { FocusRunning } from '@/components/focus-running/focus-running';
import { FocusSetup } from '@/components/focus-setup/focus-setup';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import './focus-panel.css';

/** A bottom sheet on phones and a centred dialog from 640px up: the ending, the running view or the setup. */
export const FocusPanel = () => {
  const t = useTranslations('focus');
  const { panelOpen, closePanel, session, view, target, result, plans, pending, error, start, stop, skip, confirm } =
    useFocusApi();

  const onOpenChange = (open: boolean) => {
    if (!open) {
      closePanel();
    }
  };

  const runningName = session?.habit.name;
  const runningId = session?.habitId;
  const targetId = target?.id;
  const name = result?.name ?? runningName ?? target?.name ?? '';
  const conflict = runningId && targetId && targetId !== runningId ? runningName : null;
  const title = result ? t('ending.title') : session ? t('running.title', { name }) : t('setup.title', { name });

  return (
    <Dialog open={panelOpen} onOpenChange={onOpenChange}>
      <DialogContent className="focus-panel">
        <DialogTitle className="focus-panel__title">{title}</DialogTitle>
        <DialogDescription className="focus-panel__description">{name}</DialogDescription>
        {result && <FocusEnding result={result} onConfirm={confirm} />}
        {!result && session && view && (
          <FocusRunning
            view={view}
            mode={session.mode}
            pending={pending}
            conflict={conflict ?? null}
            onStop={stop}
            onSkip={skip}
          />
        )}
        {!result && !session && target && (
          <FocusSetup target={target} last={plans[targetId ?? '']} pending={pending} error={error} onStart={start} />
        )}
      </DialogContent>
    </Dialog>
  );
};
