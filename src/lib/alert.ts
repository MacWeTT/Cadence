export interface AtRiskHabit {
  id: string;
  name: string;
  count: number;
  unit: 'day' | 'week';
}

export interface AlertInput {
  /** Local hour, 0-23. */
  hour: number;
  /** 1 to 1440; 1440 is the stroke of midnight, 1 is a minute before it. */
  minutesToMidnight: number;
  /** Habits listed today. */
  total: number;
  /** Listed habits not ticked yet, in list order. */
  open: { id: string; name: string }[];
  /** Open habits with a streak at risk, longest first. */
  atRisk: AtRiskHabit[];
  /** Ticked habits with a streak, longest first; `count` is the streak so far. */
  continuing: { name: string; count: number }[];
}

export type AlertTier = 'none' | 'done' | 'late' | 'evening' | 'afternoon' | 'morning';
export type AlertAction = { kind: 'focus'; id: string; label: string } | { kind: 'link'; href: string; label: string } | null;
export interface Alert {
  tier: AlertTier;
  message: string;
  action: AlertAction;
}

/** 340 -> "5h 40m", 180 -> "3h", 45 -> "45m". */
export function formatLeft(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const doNow = (name: string, id: string): AlertAction => ({ kind: 'focus', id, label: `Do ${name} now` });

/** The one message the banner shows. Thresholds: late 180 minutes, evening 360, afternoon from noon. */
export function alertFor(input: AlertInput): Alert {
  const { hour, minutesToMidnight, total, open, atRisk, continuing } = input;
  const left = formatLeft(minutesToMidnight);
  const top = atRisk[0];

  if (total === 0) return { tier: 'none', message: '', action: null };

  if (open.length === 0) {
    const next = continuing.slice(0, 2).map((c) => `${c.name} ${c.count + 1}`);
    const streaks = next.length > 0 ? ` Tomorrow's streaks: ${next.join(', ')}.` : '';
    return { tier: 'done', message: `All ${total} done. Nice.${streaks}`, action: null };
  }

  if (minutesToMidnight <= 180 && top) {
    const more = atRisk.length > 1 ? ` And ${atRisk.length - 1} more at risk.` : '';
    return {
      tier: 'late',
      message: `Last call: ${left}. Don't lose your ${top.count}-${top.unit} ${top.name} streak!${more}`,
      action: doNow(top.name, top.id),
    };
  }

  if (minutesToMidnight <= 360) {
    return top
      ? { tier: 'evening', message: `${left} left. ${top.name}'s ${top.count}-${top.unit} streak ends at midnight.`, action: doNow(top.name, top.id) }
      : { tier: 'evening', message: `${left} left. ${plural(open.length, 'habit', 'habits')} to go.`, action: doNow(open[0].name, open[0].id) };
  }

  if (hour >= 12) {
    return {
      tier: 'afternoon',
      message: `${open.length} left, ${left} to go.`,
      action: { kind: 'link', href: '/today', label: 'Open Today' },
    };
  }

  return { tier: 'morning', message: `${plural(total, 'habit', 'habits')} today. A good day to start with ${open[0].name}.`, action: null };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The local date, hour, weekday (0 = Sunday) and minutes to midnight of `now` in `timeZone`. */
export function clockIn(timeZone: string, now: Date): { date: string; hour: number; weekday: number; minutesToMidnight: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const hour = Number(parts.hour);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    weekday: WEEKDAYS.indexOf(parts.weekday),
    minutesToMidnight: 1440 - (hour * 60 + Number(parts.minute)),
  };
}
