'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { deleteAccountAction, importBackupAction } from '@/app/(app)/profile/account/actions';
import type { BackupSummary } from '@/lib/backup-types';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/keys';

/** How much the account holds, for the export card (and its warning when an import would refuse it). */
export const useAccountCounts = () => {
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: () => {
      return fetchJson<BackupSummary>('/api/account');
    },
  });
};

/** A failure the server explained in words, as opposed to a network error. */
class ActionError extends Error {}

/** Replaces the habits and history with a backup file. Nothing is shown early: the server is all or nothing. */
export const useImportBackup = () => {
  const queryClient = useQueryClient();
  const t = useTranslations('account.import');
  const te = useTranslations('errors');

  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();

      form.set('file', file);

      const result = await importBackupAction(form);

      if (!result.ok) {
        const { error } = result;

        throw new ActionError(error);
      }

      const { summary } = result;

      return summary;
    },
    onSuccess: summary => {
      toast.success(t('done', { habits: summary?.habits ?? 0, ticks: summary?.ticks ?? 0 }));
      void queryClient.invalidateQueries();
    },
    onError: error => {
      toast.error(error instanceof ActionError ? error.message : te('generic'));
    },
  });
};

/** Deletes the account; the browser then goes to the login page (a full load, so nothing of the session stays). */
export const useDeleteAccount = () => {
  const te = useTranslations('errors');

  return useMutation({
    mutationFn: async (email: string) => {
      const result = await deleteAccountAction(email);

      if (!result.ok) {
        const { error } = result;

        throw new ActionError(error);
      }
    },
    onSuccess: () => {
      window.location.replace('/login?deleted=1');
    },
    onError: error => {
      toast.error(error instanceof ActionError ? error.message : te('generic'));
    },
  });
};
