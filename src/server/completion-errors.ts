import { msg, type Msg } from '@/lib/message';

/** What `set_completion` refuses a tick with, mapped to the message the user sees. Keys are the database's messages. */
export const completionErrorMsg = (message: string): Msg => {
  switch (message) {
    case 'habit_not_found':
      return msg('errors.habitNotFound');
    case 'habit_archived':
      return msg('errors.completionArchived');
    case 'date_in_future':
      return msg('errors.dateInFuture');
    case 'before_start':
      return msg('errors.beforeStart');
    default:
      return msg('errors.saveFailed');
  }
};
