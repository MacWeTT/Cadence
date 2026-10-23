import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChanges } from '@/data/local/changes';
import { createFocusChanges } from '@/data/local/focus-changes';
import { migrate } from '@/data/local/migrations';
import { createReads } from '@/data/local/reads';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const START = new Date('2026-10-24T12:00:00Z');
const PLAN = { focusMin: 25, breakMin: 5, longBreakMin: 15, rounds: 4 };

const at = (minutes: number) => {
  vi.setSystemTime(new Date(START.getTime() + minutes * 60_000));
};

const setup = async () => {
  const sql = memorySql();

  await migrate(sql);

  const changes = createChanges(sql);

  await changes.createHabit({
    name: 'Read',
    icon: '📖',
    color: 'moss',
    kind: 'daily',
    startDate: '2026-10-20',
    links: [],
  });

  const [{ id }] = await sql.select<{ id: string }>('select id from habits');

  return { sql, changes, habitId: id, focus: createFocusChanges(sql), reads: createReads(sql) };
};

const free = (habitId: string, over: Record<string, unknown> = {}) => {
  return { habitId, mode: 'free', plan: null, soundId: null, ...over };
};

describe('focus on local rows', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a free session on the device clock and shows it as running', async () => {
    const { focus, reads, habitId } = await setup();

    expect(await focus.startFocus(free(habitId, { soundId: 'bell' }))).toEqual({ ok: true, result: null });

    const { running, serverNow } = await reads.focus();

    expect(running).toMatchObject({
      habitId,
      mode: 'free',
      plan: null,
      soundId: 'bell',
      startedAt: START.toISOString(),
    });
    expect(serverNow).toBe(START.toISOString());
  });

  it('refuses a bad plan, a missing sound, an archived or missing habit, and a second session', async () => {
    const { focus, changes, habitId } = await setup();
    const pomodoro = { mode: 'pomodoro', plan: { ...PLAN, rounds: 0 } };

    expect(await focus.startFocus(free(habitId, pomodoro))).toMatchObject({ ok: false, error: expect.any(String) });
    expect(await focus.startFocus(free(habitId, { mode: 'pomodoro', plan: null }))).toMatchObject({ ok: false });
    expect(await focus.startFocus({ nonsense: true })).toMatchObject({ ok: false });
    expect(await focus.startFocus(free(habitId, { soundId: '5b1d3f0e-2c4a-4a6e-9a4c-0d3f6a2b8c11' }))).toMatchObject({
      ok: false,
    });
    expect(await focus.startFocus(free('5b1d3f0e-2c4a-4a6e-9a4c-0d3f6a2b8c11'))).toMatchObject({ ok: false });

    expect(await focus.startFocus(free(habitId))).toEqual({ ok: true, result: null });
    expect(await focus.startFocus(free(habitId))).toMatchObject({
      ok: false,
      error: expect.stringContaining('running'),
    });

    await focus.stopFocus();
    await changes.archiveHabit(habitId);

    expect(await focus.startFocus(free(habitId))).toMatchObject({ ok: false });
  });

  it('keeps the plan and the last numbers used on the habit', async () => {
    const { focus, reads, habitId } = await setup();

    await focus.startFocus(free(habitId, { mode: 'pomodoro', plan: PLAN }));

    const { running, plans } = await reads.focus();

    expect(running?.plan).toEqual(PLAN);
    expect(plans[habitId]).toEqual(PLAN);
  });

  it('closes a session that ran out before a new one starts', async () => {
    const { focus, sql, habitId } = await setup();

    await focus.startFocus(free(habitId));
    at(9 * 60);

    expect(await focus.startFocus(free(habitId))).toEqual({ ok: true, result: null });
    expect(await sql.select('select focus_seconds from focus_sessions where ended_at is not null')).toEqual([
      { focus_seconds: 8 * 3600 },
    ]);
  });

  it('stops a session and says what it left behind', async () => {
    const { focus, sql, habitId } = await setup();

    await focus.startFocus(free(habitId));
    at(30);

    const stopped = await focus.stopFocus();

    expect(stopped).toEqual({
      ok: true,
      result: { sessionId: expect.any(String), habitId, focusSeconds: 1800, date: '2026-10-24', saved: true },
    });
    expect(await sql.select('select ended_at, paused_at from focus_sessions')).toEqual([
      { ended_at: new Date(START.getTime() + 1800_000).toISOString(), paused_at: null },
    ]);
    expect(await focus.stopFocus()).toEqual({ ok: true, result: null });
  });

  it('drops a session under a minute instead of saving it', async () => {
    const { focus, sql, habitId } = await setup();

    await focus.startFocus(free(habitId));
    vi.setSystemTime(new Date(START.getTime() + 20_000));

    expect(await focus.stopFocus()).toMatchObject({ ok: true, result: { saved: false, focusSeconds: 20 } });
    expect(await sql.select('select id from focus_sessions')).toEqual([]);
  });

  it('holds the clock while paused and counts the pause on resume', async () => {
    const { focus, sql, habitId } = await setup();

    await focus.startFocus(free(habitId));
    at(10);
    await focus.pauseFocus();
    await focus.pauseFocus();
    at(40);
    await focus.resumeFocus();
    await focus.resumeFocus();

    expect(await sql.select('select paused_at, paused_seconds from focus_sessions')).toEqual([
      { paused_at: null, paused_seconds: 1800 },
    ]);

    at(50);

    expect(await focus.stopFocus()).toMatchObject({ result: { focusSeconds: 1200 } });
  });

  it('skips the rest of a break, and not while paused or in a focus phase', async () => {
    const { focus, sql, habitId } = await setup();

    await focus.startFocus(free(habitId, { mode: 'pomodoro', plan: PLAN }));
    at(10);
    await focus.skipBreak();

    expect(await sql.select('select skipped_seconds from focus_sessions')).toEqual([{ skipped_seconds: 0 }]);

    at(27); // 2 minutes into the first break
    await focus.pauseFocus();
    await focus.skipBreak();

    expect(await sql.select('select skipped_seconds from focus_sessions')).toEqual([{ skipped_seconds: 0 }]);

    await focus.resumeFocus();
    await focus.skipBreak();

    expect(await sql.select('select skipped_seconds from focus_sessions')).toEqual([{ skipped_seconds: 180 }]);
  });

  it('discards a finished session but never a running one', async () => {
    const { focus, sql, habitId } = await setup();

    await focus.startFocus(free(habitId));

    const [{ id }] = await sql.select<{ id: string }>('select id from focus_sessions');

    await focus.discardFocus(id);

    expect(await sql.select('select id from focus_sessions')).toHaveLength(1);

    at(30);
    await focus.stopFocus();

    expect(await focus.discardFocus(id)).toEqual({ ok: true, result: null });
    expect(await sql.select('select id from focus_sessions')).toEqual([]);
    expect(await focus.discardFocus('nope')).toMatchObject({ ok: false });
  });
});
