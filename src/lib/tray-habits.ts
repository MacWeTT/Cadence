/** How many habits the tray menu lists; a longer menu is hard to use. */
export const TRAY_HABIT_LIMIT = 10;

/** The habits still open today, as the tray needs them (an id to start on, and a name to show), in Home's order. */
export const trayHabits = (todo: { id: string; name: string }[]): { id: string; name: string }[] => {
  return todo.slice(0, TRAY_HABIT_LIMIT).map(({ id, name }) => {
    return { id, name };
  });
};
