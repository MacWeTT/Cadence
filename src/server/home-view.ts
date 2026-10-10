// Pure mapping for the Home page. Kept free of `server-only` so it can be unit-tested.
import { diffDays, weekStart } from '@/domain/dates';
import type { Streak } from '@/domain/streaks';
import type { Ctx, HabitData } from '@/domain/types';
import type { ColorKey } from '@/lib/palette';
import type { HabitRow } from './habit-view';
import { buildTodayView, type TodayRow, type TodayView } from './today-view';

export interface AtRiskRow {
  id: string;
  name: string;
  icon: string;
  color: ColorKey;
  streak: Streak;
  /** Weekly habits only: ticks still needed this week, and days left including today. */
  needed: number | null;
  daysLeft: number | null;
}

export interface HomeView {
  /** Today's lists, week strip and flags. */
  view: TodayView;
  /** Open habits whose streak is in danger, longest first. */
  atRisk: AtRiskRow[];
}

export function buildHomeView(entries: { habit: HabitRow; data: HabitData }[], ctx: Ctx): HomeView {
  const view = buildTodayView(entries, ctx.today, ctx);
  const daysLeft = 7 - diffDays(weekStart(ctx.today, ctx.weekStartsOn), ctx.today);

  const atRisk: AtRiskRow[] = [];
  for (const r of view.todo) {
    if (!r.streak) continue; // only today's rows carry a streak, and only above 0
    const needed = r.week ? r.week.target - r.week.done : null;
    // A weekly goal is in danger when every remaining day is needed. Fewer needed is comfortable, more is already lost
    // (one tick a day), and a met goal is safe.
    if (r.week && (r.week.goalMet || needed !== daysLeft)) continue;
    atRisk.push({ id: r.id, name: r.name, icon: r.icon, color: r.color, streak: r.streak, needed, daysLeft: r.week ? daysLeft : null });
  }
  atRisk.sort((a, b) => b.streak.count - a.streak.count);

  return { view, atRisk };
}

/**
 * Ticked daily habits with a streak, longest first, `count` being the streak so far today. `wasOpen` holds the habits that
 * were still open in the server's view: their tick is optimistic, so today is not in their streak yet and is added.
 * A weekly streak does not grow tomorrow, so weekly habits are left out.
 */
export function continuingStreaks(done: TodayRow[], wasOpen: ReadonlySet<string>): { name: string; count: number }[] {
  return done
    .filter((r) => !r.week)
    .map((r) => ({ name: r.name, count: (r.streak?.count ?? 0) + (wasOpen.has(r.id) ? 1 : 0) }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}
