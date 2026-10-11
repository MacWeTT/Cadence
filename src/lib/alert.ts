import { msg, type Msg } from '@/lib/message';

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
export type AlertAction = { kind: 'focus'; id: string; label: Msg } | { kind: 'link'; href: string; label: Msg } | null;

export interface Alert {
  tier: AlertTier;
  /** `null` when there is nothing to say. */
  message: Msg | null;
  action: AlertAction;
}

/** 340 -> "5h 40m", 180 -> "3h", 45 -> "45m". */
export const timeLeft = (minutes: number): Msg => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) {
    return msg('common.time.minutes', { m });
  }

  return m === 0 ? msg('common.time.hours', { h }) : msg('common.time.hoursMinutes', { h, m });
};

const doNow = (name: string, id: string): AlertAction => {
  return { kind: 'focus', id, label: msg('alert.doNow', { name }) };
};

/** The one message the banner shows. Thresholds: late 180 minutes, evening 360, afternoon from noon. */
export const alertFor = (input: AlertInput): Alert => {
  const { hour, minutesToMidnight, total, open, atRisk, continuing } = input;

  const left = timeLeft(minutesToMidnight);
  const top = atRisk[0];
  const openCount = open.length;

  if (total === 0) {
    return { tier: 'none', message: null, action: null };
  }

  if (openCount === 0) {
    const next = continuing.slice(0, 2).map(({ name, count }) => {
      return `${name} ${count + 1}`;
    });

    // shortcut: the streak list is joined with commas, not through Intl.ListFormat; use it when a second language arrives.
    const streaks = next.length > 0 ? msg('alert.tomorrow', { list: next.join(', ') }) : '';

    return { tier: 'done', message: msg('alert.done', { total, streaks }), action: null };
  }

  if (minutesToMidnight <= 180 && top) {
    const { unit, count, name, id } = top;
    const others = atRisk.length - 1;
    const more = others > 0 ? msg('alert.moreAtRisk', { count: others }) : '';

    return {
      tier: 'late',
      message: msg(unit === 'week' ? 'alert.lateWeek' : 'alert.lateDay', { left, count, name, more }),
      action: doNow(name, id),
    };
  }

  if (minutesToMidnight <= 360) {
    if (top) {
      const { unit, count, name, id } = top;

      return {
        tier: 'evening',
        message: msg(unit === 'week' ? 'alert.eveningWeek' : 'alert.eveningDay', { left, name, count }),
        action: doNow(name, id),
      };
    }

    return {
      tier: 'evening',
      message: msg('alert.eveningOpen', { left, count: openCount }),
      action: doNow(open[0].name, open[0].id),
    };
  }

  if (hour >= 12) {
    return {
      tier: 'afternoon',
      message: msg('alert.afternoon', { count: openCount, left }),
      action: { kind: 'link', href: '/today', label: msg('alert.openToday') },
    };
  }

  return {
    tier: 'morning',
    message: msg('alert.morning', { count: total, first: open[0].name }),
    action: null,
  };
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The local date, hour, weekday (0 = Sunday) and minutes to midnight of `now` in `timeZone`. */
export const clockIn = (
  timeZone: string,
  now: Date,
): { date: string; hour: number; weekday: number; minutesToMidnight: number } => {
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
      .map(p => {
        return [p.type, p.value];
      }),
  );
  const { year, month, day, weekday, hour: hourText, minute } = parts;
  const hour = Number(hourText);

  return {
    date: `${year}-${month}-${day}`,
    hour,
    weekday: WEEKDAYS.indexOf(weekday),
    minutesToMidnight: 1440 - (hour * 60 + Number(minute)),
  };
};
