import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '@/data/local/migrations';
import type { Sql } from '@/data/local/sql';
import { syncTimezone } from '@/data/local/timezone';
import { memorySql } from '@tests/unit/data/local/memory-sql';

let sql: Sql;

const stored = async (): Promise<string> => {
  const [row] = await sql.select<{ timezone: string }>('select timezone from profile where id = 1');

  return row.timezone;
};

beforeEach(async () => {
  sql = memorySql();
  await migrate(sql);
});

describe('syncing the device timezone', () => {
  it('saves the timezone the device is in over the UTC default, and says so', async () => {
    await expect(syncTimezone(sql, 'Asia/Kolkata')).resolves.toBe(true);

    expect(await stored()).toBe('Asia/Kolkata');
  });

  it('leaves a timezone the person has already got, whatever the device says', async () => {
    await sql.batch([{ query: "update profile set timezone = 'Europe/Paris' where id = 1" }]);

    await expect(syncTimezone(sql, 'Asia/Kolkata')).resolves.toBe(false);

    expect(await stored()).toBe('Europe/Paris');
  });

  it('refuses a timezone that is not one, and has nothing to save for UTC itself', async () => {
    await expect(syncTimezone(sql, 'Mars/Olympus')).resolves.toBe(false);
    await expect(syncTimezone(sql, 'UTC')).resolves.toBe(false);

    expect(await stored()).toBe('UTC');
  });
});
