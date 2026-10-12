import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { CalendarDate } from '@/domain/dates';
import { getMsg } from '@/i18n/get-msg';
import { formatCalendarDate } from '@/lib/format';
import { scheduleMsg } from '@/lib/schedule-label';
import type { ReportLabels } from '@/server/report-pdf';

/** The words of the PDF report, from the message files, with the person's name and today filled in. */
export const getReportLabels = async (name: string, today: CalendarDate): Promise<ReportLabels> => {
  const t = await getTranslations('account.report');
  const tm = await getMsg();

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
