import type { ErrorCode } from '@/server/habits';

/**
 * Every message the Circles functions raise (`raise exception '...'`), and the message a person sees for it. The codes
 * a person cannot reach from the screens (a bad level, your own habit's id) are a plain generic failure. A test reads
 * the migration and fails when a new code is raised without being listed here.
 */
export const CIRCLE_DB_CODES: Record<string, ErrorCode> = {
  not_signed_in: 'signIn',
  invalid_name: 'circleNameInvalid',
  not_owner: 'notOwner',
  not_a_member: 'notAMember',
  invite_invalid: 'inviteInvalid',
  already_member: 'alreadyMember',
  circle_full: 'circleFull',
  too_many_circles: 'tooManyCircles',
  cheers_off: 'cheersOff',
  cheer_date: 'cheerDate',
  react_date: 'reactDate',
  use_leave: 'generic',
  cannot_cheer_self: 'generic',
  not_your_habit: 'generic',
  viewer_not_member: 'generic',
  invalid_viewer: 'generic',
  invalid_level: 'generic',
  invalid_label: 'generic',
  invalid_color: 'generic',
  invalid_emoji: 'generic',
  not_a_pair: 'generic',
  level_not_everything: 'generic',
  cannot_react_self: 'generic',
};

export const circleErrorCode = (message: string): ErrorCode => {
  return Object.hasOwn(CIRCLE_DB_CODES, message) ? CIRCLE_DB_CODES[message] : 'generic';
};
