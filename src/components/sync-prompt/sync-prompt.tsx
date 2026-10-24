'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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
import { local } from '@/data/local';
import type { BackupSummary } from '@/lib/backup-types';
import { useSession } from '@/lib/query/use-session';
import './sync-prompt.css';

type Case = 'offerUpload' | 'ask';

interface PromptState {
  open: Case | null;
  userId: string;
  pc: BackupSummary | null;
  account: BackupSummary | null;
  busy: boolean;
  error: boolean;
}

/** How often a running app checks the account for changes made elsewhere. */
const STEP_EVERY_MS = 60_000;

const START: PromptState = { open: null, userId: '', pc: null, account: null, busy: false, error: false };

/**
 * The desktop app's question after signing in: bring the PC's habits and the account's together (see the desktop spec,
 * "Signing in, and the sync rule"). It runs whenever someone is signed in whose account this file is not linked to yet,
 * so a sync that was cancelled or failed is offered again at the next start.
 */
export const SyncPrompt = () => {
  const [state, setState] = useState<PromptState>(START);

  const t = useTranslations('sync');
  const queryClient = useQueryClient();
  const { data: user } = useSession();

  const { open, userId, pc, account, busy, error } = state;
  const id = user?.id;

  useEffect(() => {
    if (!id) {
      return;
    }

    const run = async () => {
      const registration = await local.registration();

      // a first Google sign-in finishes on the register screen first; the sync waits for it
      if (!registration?.registered) {
        return;
      }

      const { plan, local: onPc, account: onAccount } = await local.sync.check(id);

      if (plan === 'nothing') {
        // neither side has habits: the account's settings still win, so the PC's do not overwrite them later
        await local.sync.pull(id);
      } else if (plan === 'pull') {
        await local.sync.pull(id);
        toast.success(t('pulled'));
        void queryClient.invalidateQueries();
      } else if (plan === 'offerUpload' || plan === 'ask') {
        setState({ ...START, open: plan, userId: id, pc: onPc, account: onAccount });
      }
    };

    run().catch(() => {
      // offline or refused: nothing changed, and it is asked again at the next start
    });
  }, [id, queryClient, t]);

  // Once linked, stay in step: now, when the window is shown again, when the connection returns, and every minute.
  useEffect(() => {
    if (!id) {
      return;
    }

    const round = () => {
      local
        .stayInStep(id)
        .then(({ pulled }) => {
          if (pulled) {
            void queryClient.invalidateQueries();
          }
        })
        .catch(() => {
          // offline: the changes stay marked and go out at the next round
        });
    };

    round();
    window.addEventListener('focus', round);
    window.addEventListener('online', round);

    const timer = window.setInterval(round, STEP_EVERY_MS);

    return () => {
      window.removeEventListener('focus', round);
      window.removeEventListener('online', round);
      window.clearInterval(timer);
    };
  }, [id, queryClient]);

  const attempt = async (work: () => Promise<void>, message: string) => {
    setState({ ...state, busy: true, error: false });

    try {
      await work();
      setState(START);
      toast.success(message);
      void queryClient.invalidateQueries();
    } catch {
      setState({ ...state, busy: false, error: true });
    }
  };

  const onUpload = () => {
    return attempt(() => {
      return local.sync.upload(userId);
    }, t('uploaded'));
  };

  const onKeepPc = () => {
    return attempt(() => {
      return local.sync.keepPc(userId);
    }, t('uploaded'));
  };

  const onKeepAccount = () => {
    return attempt(() => {
      return local.sync.keepAccount(userId);
    }, t('pulled'));
  };

  const onDecline = async () => {
    await local.sync.decline(userId);
    setState(START);
    toast.success(t('declined'));
  };

  const onLater = () => {
    setState(START);
  };

  const onDownloadAccount = async () => {
    try {
      const { fileName, type, text } = await local.accountCopy();
      const url = URL.createObjectURL(new Blob([text], { type }));
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setState({ ...state, error: true });
    }
  };

  const onOpenChange = (next: boolean) => {
    if (!next && !busy) {
      onLater();
    }
  };

  if (!open || !pc || !account) {
    return null;
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sync-prompt">
        <DialogHeader>
          <DialogTitle className="sync-prompt__title">{open === 'ask' ? t('askTitle') : t('uploadTitle')}</DialogTitle>
          <DialogDescription className="sync-prompt__description">
            {open === 'ask' ? t('askDescription') : t('uploadDescription', { habits: pc.habits })}
          </DialogDescription>
        </DialogHeader>
        {open === 'ask' && (
          <div className="sync-prompt__sides">
            <div className="sync-prompt__side">
              <p className="sync-prompt__side-name">{t('pc')}</p>
              <p>{t('counts', { ...pc })}</p>
            </div>
            <div className="sync-prompt__side">
              <p className="sync-prompt__side-name">{t('account')}</p>
              <p>{t('counts', { ...account })}</p>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="sync-prompt__error">
            {t('failed')}
          </p>
        )}
        <DialogFooter className="sync-prompt__actions">
          {open === 'ask' ? (
            <>
              <Button variant="outline" disabled={busy} onClick={onDownloadAccount}>
                {t('downloadAccount')}
              </Button>
              <Button variant="outline" disabled={busy} onClick={onLater}>
                {t('later')}
              </Button>
              <Button variant="destructive" disabled={busy} onClick={onKeepAccount}>
                {t('keepAccount')}
              </Button>
              <Button variant="destructive" disabled={busy} onClick={onKeepPc}>
                {t('keepPc')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={busy} onClick={onDecline}>
                {t('keepOnPc')}
              </Button>
              <Button disabled={busy} onClick={onUpload}>
                {t('upload')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
