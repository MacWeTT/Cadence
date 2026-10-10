import type { Schedule } from '@/domain/types';

export const scheduleLabel = (schedule: Schedule): string => {
  return schedule.kind === 'daily' ? 'Every day' : `${schedule.timesPerWeek}× a week`;
};
