import type { z } from 'zod';
import { createFocusChanges } from '@/data/local/focus-changes';
import { failed, t } from '@/data/local/outcome';
import type { Sql, Statement } from '@/data/local/sql';
import type { DataSource, ProfileActionResult } from '@/data/types';
import {
  accentInputSchema,
  avatarInputSchema,
  nameInputSchema,
  soundInputSchema,
  tagInputSchema,
  timezoneInputSchema,
  weekStartInputSchema,
} from '@/lib/profile-schema';
import { msg, translateMsg, type MessageKey } from '@/lib/message';
import { isChimeId } from '@/lib/chimes';

type ProfileChanges = Pick<
  DataSource,
  | 'updateName'
  | 'updateTag'
  | 'setPassword'
  | 'updateWeekStart'
  | 'updateTimezone'
  | 'updateAvatar'
  | 'uploadAvatarPhoto'
  | 'updateAccent'
  | 'updateSound'
  | 'uploadSound'
  | 'removeSound'
>;

const say = (key: MessageKey): ProfileActionResult => {
  return { ok: false, error: translateMsg(t, msg(key)) };
};

const invalid = (error: z.ZodError): ProfileActionResult => {
  const [{ message }] = error.issues;

  return say(`validation.${message}` as MessageKey);
};

/** What needs an account (a password, a photo or sound file stored on the server) answers so, instead of failing quietly. */
const needsAccount = (): Promise<ProfileActionResult> => {
  return Promise.resolve(say('errors.needsAccount'));
};

/** The profile's edits on the PC's one profile row. Each input is checked with the same schema the server uses. */
export const createProfileChanges = (sql: Sql): ProfileChanges => {
  const save = async (statements: Statement[]): Promise<ProfileActionResult> => {
    try {
      await sql.batch(statements);

      return { ok: true };
    } catch (e) {
      return failed(e);
    }
  };

  const set = (column: string, values: unknown[]): Statement => {
    return { query: `update profile set ${column} where id = 1`, params: values };
  };

  const edit = <S extends z.ZodType>(schema: S, toStatement: (data: z.output<S>) => Statement) => {
    return (input: unknown): Promise<ProfileActionResult> => {
      const { success, data, error } = schema.safeParse(input);

      return success ? save([toStatement(data)]) : Promise.resolve(invalid(error));
    };
  };

  const { stopFocus } = createFocusChanges(sql);

  return {
    updateName: edit(nameInputSchema, ({ name }) => {
      return set('display_name = ?', [name]);
    }),
    updateTag: edit(tagInputSchema, ({ tag }) => {
      return set('tag = ?', [tag]);
    }),
    updateWeekStart: edit(weekStartInputSchema, ({ weekStartsOn }) => {
      return set('week_starts_on = ?', [weekStartsOn]);
    }),
    updateAvatar: edit(avatarInputSchema, ({ kind, value, color }) => {
      return set('avatar_kind = ?, avatar_value = ?, avatar_color = ?', [kind, value, color]);
    }),
    updateAccent: edit(accentInputSchema, ({ accent, customHex }) => {
      return set('accent = ?, accent_custom = ?', [accent, customHex]);
    }),
    updateSound: input => {
      const { success, data, error } = soundInputSchema.safeParse(input);

      if (!success) {
        return Promise.resolve(invalid(error));
      }

      const { id, volume } = data;

      // shortcut: only the built-in sounds exist on the PC until custom sounds are stored locally.
      return isChimeId(id) ? save([set('sound_id = ?, sound_volume = ?', [id, volume])]) : needsAccount();
    },
    updateTimezone: async input => {
      const { success, data, error } = timezoneInputSchema.safeParse(input);

      if (!success) {
        return invalid(error);
      }

      // a running session is ended first, so it is not cut in two by the day changing under it
      await stopFocus();

      return save([set('timezone = ?', [data.timezone])]);
    },
    setPassword: needsAccount,
    uploadAvatarPhoto: needsAccount,
    uploadSound: needsAccount,
    removeSound: needsAccount,
  };
};
