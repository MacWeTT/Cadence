import { execute, type Sql } from '@/data/local/sql';
import { isValidTimeZone } from '@/lib/habit-schema';

/**
 * Offers the device's timezone to the profile. It is only saved over the UTC default (a timezone the person chose is never
 * overwritten), and the answer says whether it was saved. The same rule as the server's.
 */
export const syncTimezone = async (sql: Sql, deviceTimeZone: string): Promise<boolean> => {
  if (deviceTimeZone === 'UTC' || !isValidTimeZone(deviceTimeZone)) {
    return false;
  }

  const [before] = await sql.select<{ timezone: string }>('select timezone from profile where id = 1');

  if (before.timezone !== 'UTC') {
    return false;
  }

  await execute(sql, "update profile set timezone = ? where id = 1 and timezone = 'UTC'", [deviceTimeZone]);

  return true;
};
