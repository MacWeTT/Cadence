import type { Schedule } from '@/domain/types';
import { msg, type Msg } from './message';

/** "Every day" or "3× a week". */
export const scheduleMsg = (schedule: Schedule): Msg => {
  return schedule.kind === 'daily'
    ? msg('labels.schedule.daily')
    : msg('labels.schedule.weekly', { times: schedule.timesPerWeek });
};
