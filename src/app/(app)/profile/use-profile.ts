'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  removeSoundAction,
  updateAvatarAction,
  updateNameAction,
  updateSoundAction,
  updateTagAction,
  updateTimezoneAction,
  updateWeekStartAction,
  uploadAvatarPhotoAction,
  uploadSoundAction,
  type ProfileActionResult,
} from '@/app/(app)/profile/actions';
import {
  withAvatar,
  withName,
  withPhoto,
  withSound,
  withSoundRemoved,
  withTag,
  withTimezone,
  withWeekStart,
} from '@/lib/profile-optimistic';
import type { AvatarInput } from '@/lib/profile-schema';
import { dataSource } from '@/data';
import { queryKeys } from '@/lib/query/keys';
import { normaliseTag } from '@/lib/tag';
import { zoneLabel } from '@/lib/zones';
import type { ProfileView } from '@/server/profile-view';

/** The profile: shown from the cache at once when it is there, and refreshed in the background. */
export const useProfile = () => {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => {
      return dataSource.profile();
    },
  });
};

/** A failure the server explained in words, as opposed to a network error. */
class ActionError extends Error {}

interface Edit<T> {
  action: (input: T) => Promise<ProfileActionResult>;
  /** The profile as it will look once this succeeds; left out when there is nothing to show before the answer. */
  apply?: (view: ProfileView, input: T) => ProfileView;
  success: (input: T) => string;
  /** The day changed under every page (timezone, week start): all cached pages are refetched, not only the profile. */
  refreshAll?: boolean;
}

/**
 * Every edit on the profile answers at once: the row shows the new value before the server has replied. If the server
 * refuses (or the network fails) the row goes back as it was and an error toast says why; on success a toast says what
 * changed. Either way the cache is then refreshed from the server.
 */
const useEdit = <T>(edit: Edit<T>) => {
  const { action, apply, success, refreshAll } = edit;

  const queryClient = useQueryClient();
  const t = useTranslations('errors');

  return useMutation({
    mutationFn: async (input: T) => {
      const result = await action(input);

      if (!result.ok) {
        throw new ActionError(result.error);
      }

      return result;
    },
    onMutate: async (input: T) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });

      const previous = queryClient.getQueryData<ProfileView>(queryKeys.profile);

      if (previous && apply) {
        queryClient.setQueryData<ProfileView>(queryKeys.profile, apply(previous, input));
      }

      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData<ProfileView>(queryKeys.profile, context.previous);
      }

      toast.error(error instanceof ActionError ? error.message : t('generic'));
    },
    onSuccess: (_result, input) => {
      toast.success(success(input));
    },
    onSettled: () => {
      return refreshAll
        ? queryClient.invalidateQueries()
        : queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
};

export const useUpdateName = () => {
  const t = useTranslations('profile.toasts');

  return useEdit<string>({
    action: name => {
      return updateNameAction({ name });
    },
    apply: withName,
    success: () => {
      return t('name');
    },
  });
};

/** A tag change: shown at once, and put back with an error toast if it is taken. */
export const useUpdateTag = () => {
  const t = useTranslations('profile.toasts');

  return useEdit<string>({
    action: tag => {
      return updateTagAction({ tag });
    },
    apply: withTag,
    success: tag => {
      return t('tag', { tag: normaliseTag(tag) });
    },
  });
};

export const useUpdateWeekStart = () => {
  const t = useTranslations('profile.toasts');
  const tw = useTranslations('profile.weekdays');

  return useEdit<1 | 7>({
    action: weekStartsOn => {
      return updateWeekStartAction({ weekStartsOn });
    },
    apply: withWeekStart,
    success: weekStartsOn => {
      return t('weekStart', { day: tw(weekStartsOn === 7 ? 'sunday' : 'monday') });
    },
    refreshAll: true,
  });
};

export const useUpdateTimezone = () => {
  const t = useTranslations('profile.toasts');

  return useEdit<string>({
    action: timezone => {
      return updateTimezoneAction({ timezone });
    },
    apply: withTimezone,
    success: timezone => {
      return t('timezone', { city: zoneLabel(timezone).city });
    },
    refreshAll: true,
  });
};

export const useUpdateAvatar = () => {
  const t = useTranslations('profile.toasts');

  return useEdit<AvatarInput>({
    action: updateAvatarAction,
    apply: withAvatar,
    success: () => {
      return t('avatar');
    },
  });
};

/** A photo already cropped square: shown from a local link at once, and replaced by the stored copy when it arrives. */
export const useUploadPhoto = () => {
  const t = useTranslations('profile.toasts');

  return useEdit<File>({
    action: file => {
      const form = new FormData();

      form.set('file', file);

      return uploadAvatarPhotoAction(form);
    },
    apply: (view, file) => {
      return withPhoto(view, URL.createObjectURL(file));
    },
    success: () => {
      return t('avatar');
    },
  });
};

export const useUpdateSound = () => {
  const t = useTranslations('profile.toasts');
  const tn = useTranslations('profile.sound.names');

  return useEdit<{ id: string; volume: number; name: string }>({
    action: ({ id, volume }) => {
      return updateSoundAction({ id, volume });
    },
    apply: (view, { id, volume }) => {
      return withSound(view, { id, volume });
    },
    success: ({ id, name }) => {
      return t('sound', { name: name || tn(id as 'bell') });
    },
  });
};

export const useUploadSound = () => {
  const t = useTranslations('profile.toasts');

  return useEdit<{ file: File; durationMs: number }>({
    action: ({ file, durationMs }) => {
      const form = new FormData();

      form.set('file', file);
      form.set('durationMs', String(durationMs));

      return uploadSoundAction(form);
    },
    success: ({ file }) => {
      return t('soundAdded', { name: file.name });
    },
  });
};

export const useRemoveSound = () => {
  const t = useTranslations('profile.toasts');

  return useEdit<{ id: string; name: string }>({
    action: ({ id }) => {
      return removeSoundAction(id);
    },
    apply: (view, { id }) => {
      return withSoundRemoved(view, id);
    },
    success: ({ name }) => {
      return t('soundRemoved', { name });
    },
  });
};
