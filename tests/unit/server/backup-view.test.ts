import { describe, expect, it } from 'vitest';
import { parseBackup, toJson } from '@/lib/backup';
import { buildBackup } from '@/server/backup-view';

const habit = (id: string, over: Record<string, unknown> = {}) => {
  return {
    id,
    name: `Habit ${id}`,
    description: null,
    icon: '📖',
    color: 'moss',
    start_date: '2026-09-01',
    created_at: '2026-09-01T08:00:00+00:00',
    archived_at: null,
    links: [] as string[],
    ...over,
  };
};

const input = {
  exportedAt: '2026-10-12T08:00:00.000Z',
  profile: { display_name: 'Manas', timezone: 'Asia/Kolkata', week_starts_on: 7 },
  habits: [habit('a', { links: ['https://x.dev'] }), habit('b', { archived_at: '2026-10-01T10:00:00+00:00' })],
  schedules: [
    { habit_id: 'a', kind: 'daily', times_per_week: null, weekdays: null, effective_from: '2026-09-01' },
    { habit_id: 'b', kind: 'weekdays', times_per_week: null, weekdays: [1, 3], effective_from: '2026-09-01' },
    { habit_id: 'a', kind: 'weekly_count', times_per_week: 3, weekdays: null, effective_from: '2026-09-21' },
  ],
  ticks: [
    { habit_id: 'a', completion_date: '2026-09-02' },
    { habit_id: 'a', completion_date: '2026-09-01' },
    { habit_id: 'b', completion_date: '2026-09-03' },
  ],
  pauses: [{ habit_id: 'b', archived_on: '2026-10-01', restored_on: null }],
  focus: [
    {
      habit_id: 'a',
      started_at: '2026-09-02T07:00:00+00:00',
      ended_at: '2026-09-02T07:25:00+00:00',
      mode: 'pomodoro',
      plan: { focusMin: 25, breakMin: 5, longBreakMin: 15, rounds: 2 },
      skipped_seconds: 0,
      focus_seconds: 1500,
    },
    {
      habit_id: 'a',
      started_at: '2026-09-03T07:00:00+00:00',
      ended_at: null,
      mode: 'free',
      plan: null,
      skipped_seconds: 0,
      focus_seconds: null,
    },
  ],
};

describe('buildBackup', () => {
  const backup = buildBackup(input);

  it('names the app and the version, and carries the account for information', () => {
    expect(backup).toMatchObject({
      app: 'cadence',
      version: 1,
      exportedAt: '2026-10-12T08:00:00.000Z',
      profile: { name: 'Manas', timezone: 'Asia/Kolkata', weekStartsOn: 7 },
    });
  });

  it("nests each habit's own schedules, check-ins, pauses and focus sessions, in order", () => {
    const [a, b] = backup.habits;

    expect(
      a.schedules.map(s => {
        return s.effectiveFrom;
      }),
    ).toEqual(['2026-09-01', '2026-09-21']);
    expect(a.ticks).toEqual(['2026-09-01', '2026-09-02']);
    expect(a.links).toEqual(['https://x.dev']);
    expect(b.schedules[0]).toMatchObject({ kind: 'weekdays', weekdays: [1, 3] });
    expect(b.ticks).toEqual(['2026-09-03']);
    expect(b.pauses).toEqual([{ archivedOn: '2026-10-01', restoredOn: null }]);
    expect(b.archivedAt).toBe('2026-10-01T10:00:00.000Z');
  });

  it('leaves out a focus session that is still running', () => {
    expect(backup.habits[0].focusSessions).toHaveLength(1);
    expect(backup.habits[0].focusSessions[0]).toMatchObject({ mode: 'pomodoro', focusSeconds: 1500 });
  });

  it('is accepted by the importer, so an export can always be restored', () => {
    expect(parseBackup(toJson(backup), 'x.json', '2026-10-12')).toMatchObject({ ok: true });
  });

  it('is fine with no habits', () => {
    expect(buildBackup({ ...input, habits: [], schedules: [], ticks: [], pauses: [], focus: [] }).habits).toEqual([]);
  });
});
