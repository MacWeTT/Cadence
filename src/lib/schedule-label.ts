import type { Schedule } from '@/domain/types';
import { weekdayNames } from '@/lib/format';
import { msg, type Msg } from '@/lib/message';

/** "Every day", "Every Mon, Wed, Fri", "3× a week" or "Whenever you like". */
export const scheduleMsg = (schedule: Schedule): Msg => {
  if (schedule.kind === 'weekly_count') {
    const { timesPerWeek } = schedule;

    return msg('labels.schedule.weekly', { times: timesPerWeek });
  }

  if (schedule.kind === 'weekdays') {
    const { days } = schedule;

    return msg('labels.schedule.weekdays', { days: weekdayNames(days) });
  }

  return msg(schedule.kind === 'optional' ? 'labels.schedule.optional' : 'labels.schedule.daily');
};
