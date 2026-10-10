/** What the user sees when `set_completion` refuses a tick. The keys are the messages raised by the database function. */
export const GENERIC_SAVE_ERROR = "Couldn't save that. Try again.";

const MESSAGES: Record<string, string> = {
  habit_not_found: 'That habit could not be found.',
  habit_archived: 'Restore this habit before ticking it.',
  date_in_future: "You can't tick a day that hasn't happened yet.",
  before_start: 'That day is before the habit started.',
};

export function completionErrorMessage(message: string): string {
  return MESSAGES[message] ?? GENERIC_SAVE_ERROR;
}
