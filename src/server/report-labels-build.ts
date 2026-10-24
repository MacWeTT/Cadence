import type { CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import type { Msg } from '@/lib/message';
import { scheduleMsg } from '@/lib/schedule-label';
import type { ReportLabels } from '@/server/report-pdf';

/** What `getTranslations('account.report')` and `createTranslator({ namespace: 'account.report' })` return, loosened. */
type Say = (key: never, values?: never) => string;

/**
 * The words of the PDF report, from the message files, with the person's name and today filled in. It takes the
 * translators as arguments, so the server (`getReportLabels`) and the desktop app (which has no server) both build the same
 * report: `say` reads `account.report`, and `tm` turns a message (a schedule's name) into text.
 */
export const buildReportLabels = (
  say: Say,
  tm: (m: Msg) => string,
  name: string,
  today: CalendarDate,
): ReportLabels => {
  const t = say as unknown as (key: string, values?: Record<string, string | number>) => string;

  const duration = (minutes: number): string => {
    return t('duration', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  };

  return {
    subtitle: t('subtitle'),
    generated: t('generated', { date: formatCalendarDate(today, { dateStyle: 'long' }) }),
    heading: name ? t('heading', { name }) : t('headingAnonymous'),
    empty: t('empty'),
    made: t('made'),
    archived: t('archived'),
    tiles: {
      habits: t('tiles.habits'),
      checkIns: t('tiles.checkIns'),
      focus: t('tiles.focus'),
      streak: t('tiles.streak'),
    },
    stats: {
      current: t('stats.current'),
      longest: t('stats.longest'),
      rate30: t('stats.rate30'),
      rate90: t('stats.rate90'),
    },
    heat: { done: t('heat.done'), missed: t('heat.missed') },
    streak: ({ count, unit }) => {
      return unit === 'week' ? t('streakWeek', { count }) : t('streakDay', { count });
    },
    schedule: schedule => {
      return tm(scheduleMsg(schedule));
    },
    checkIns: count => {
      return t('checkIns', { count });
    },
    focus: minutes => {
      return t('focus', { duration: duration(minutes) });
    },
    duration,
    bestStreak: habit => {
      return t('bestStreak', { name: habit });
    },
    pageOf: (page, total) => {
      return t('pageOf', { page, total });
    },
  };
};
