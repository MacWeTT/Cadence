import type { Schedule } from '@/domain/types';

export function scheduleLabel(schedule: Schedule): string {
  return schedule.kind === 'daily' ? 'Every day' : `${schedule.timesPerWeek}× a week`;
}
