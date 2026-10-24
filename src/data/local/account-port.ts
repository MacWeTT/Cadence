import type { Cloud } from '@/data/local/auth';
import { SETTINGS_COLUMNS } from '@/data/local/settings-columns';
import type { AccountPort, AccountSettings } from '@/data/local/sync';
import type { Backup } from '@/lib/backup-types';
import type { Json } from '@/lib/supabase/database.types';
import { countAccount, readAccountBackup } from '@/server/backup-read';

/** The account, through the person's own Supabase session: row-level security limits every call to their rows. */
export const cloudAccount = (cloud: Cloud): AccountPort => {
  const userId = async (): Promise<string> => {
    const { data } = await cloud.auth.getSession();
    const id = data.session?.user.id;

    if (!id) {
      throw new Error('Not signed in.');
    }

    return id;
  };

  return {
    counts: () => {
      return countAccount(cloud);
    },
    readBackup: async () => {
      return readAccountBackup(cloud, await userId());
    },
    replace: async (backup: Backup) => {
      const { error } = await cloud.rpc('replace_my_data', { p_backup: backup as unknown as Json });

      if (error) {
        throw error;
      }
    },
    settings: async () => {
      const { data, error } = await cloud
        .from('profiles')
        .select(SETTINGS_COLUMNS)
        .eq('user_id', await userId())
        .single();

      if (error) {
        throw error;
      }

      return data as unknown as AccountSettings;
    },
    saveSettings: async patch => {
      const { error } = await cloud
        .from('profiles')
        .update(patch)
        .eq('user_id', await userId());

      if (error) {
        throw error;
      }
    },
  };
};
