'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { dataSource } from '@/data';
import { queryKeys } from '@/lib/query/keys';

/** A failure the server explained in words, as opposed to a network error. */
class ActionError extends Error {}

interface PasswordInput {
  password: string;
  confirm: string;
}

/** Sets or changes the password. Nothing is shown early: the modal stays open until the server has accepted it. */
export const useSetPassword = () => {
  const queryClient = useQueryClient();
  const t = useTranslations('account.signIn');
  const te = useTranslations('errors');

  return useMutation({
    mutationFn: async (input: PasswordInput) => {
      const result = await dataSource.setPassword(input);

      if (!result.ok) {
        throw new ActionError(result.error);
      }
    },
    onSuccess: () => {
      toast.success(t('saved'));
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
    onError: error => {
      toast.error(error instanceof ActionError ? error.message : te('generic'));
    },
  });
};
