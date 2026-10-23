import type { Sql } from '@/data/local/sql';
import { loadLocal, pullStatements } from '@/data/local/step-pull';
import { pushOne } from '@/data/local/step-push';
import { Rejected, type Dirty, type StepPort } from '@/data/local/step-types';

export { Rejected };
export type { HabitPayload, RemoteFocus, RemoteHabit, RemoteState, StepPort } from '@/data/local/step-types';

/** Habits first (everything else belongs to one), then sessions, ticks and the settings. */
const DIRTY_ORDER = "case kind when 'habit' then 0 when 'focus' then 1 when 'tick' then 2 else 3 end";

interface Round {
  pushed: number;
  pulled: boolean;
}

/**
 * Keeps the PC's file and the account in step once the file is linked: what was changed on the PC is sent (the changes
 * are marked in `dirty` by triggers, see the migrations), then what was changed elsewhere is brought in. The same record
 * changed on both sides: the newest edit wins. A failure part-way (no connection) leaves every mark where it was, and the
 * next run carries on.
 */
export const createStayInStep = (sql: Sql, port: StepPort) => {
  /** Sends the marked changes, one record at a time. A mark is cleared only if the record did not change meanwhile. */
  const drain = async (): Promise<number> => {
    const marks = await sql.select<Dirty>(`select kind, id, seq from dirty order by ${DIRTY_ORDER}, seq`);

    for (const mark of marks) {
      try {
        await pushOne(sql, port, mark);
      } catch (e) {
        // the account refused it for good: it is dropped, not retried forever; anything else (no connection) stops here
        if (!(e instanceof Rejected)) {
          throw e;
        }
      }

      const { kind, id, seq } = mark;

      await sql.batch([{ query: 'delete from dirty where kind = ? and id = ? and seq = ?', params: [kind, id, seq] }]);
    }

    return marks.length;
  };

  const dirtyMark = async (): Promise<string> => {
    const [row] = await sql.select<{ n: number; last: number | null }>(
      'select count(*) as n, max(seq) as last from dirty',
    );
    const { n, last } = row;

    return `${n}:${last}`;
  };

  /** Brings in what changed elsewhere, in one transaction, without marking it as a change to send back. */
  const pull = async (): Promise<boolean> => {
    const before = await dirtyMark();
    const remote = await port.readState();

    // shortcut: a change made on the PC while the account was being read waits for the next run, instead of being checked
    // inside the transaction; the gap between this check and the write below is a few milliseconds.
    if ((await dirtyMark()) !== before) {
      return false;
    }

    const statements = pullStatements(remote, await loadLocal(sql));

    if (statements.length === 0) {
      return false;
    }

    await sql.batch([
      { query: "insert or replace into meta (key, value) values ('applying_remote', '1')" },
      ...statements,
      { query: "delete from meta where key = 'applying_remote'" },
    ]);

    return true;
  };

  const execute = async (userId: string): Promise<Round> => {
    const [linked] = await sql.select<{ value: string }>("select value from meta where key = 'linked_user_id'");

    // a file linked to another account (or to none) is never written to this one
    if (linked?.value !== userId) {
      return { pushed: 0, pulled: false };
    }

    const pushed = await drain();

    return { pushed, pulled: await pull() };
  };

  let running: Promise<Round> | null = null;

  /** One round: send, then bring in. Called again while one is running, it waits for that one and gives its answer. */
  const run = (userId: string): Promise<Round> => {
    running ??= execute(userId).finally(() => {
      running = null;
    });

    return running;
  };

  return { run };
};
