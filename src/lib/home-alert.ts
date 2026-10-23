import { alertFor, clockIn, type Alert } from '@/lib/alert';
import type { HomeData } from '@/server/home';
import { continuingStreaks } from '@/server/home-view';

/** The one alert Home shows for its data at this moment, read on the person's clock (their timezone, not the device's). */
export const homeAlert = (data: HomeData, now: Date): Alert => {
  const { view, atRisk: atRiskRows, timezone } = data;
  const { todo, done } = view;
  const open = new Set(
    todo.map(({ id }) => {
      return id;
    }),
  );

  return alertFor({
    ...clockIn(timezone, now),
    total: todo.length + done.length,
    open: todo.map(({ id, name }) => {
      return { id, name };
    }),
    atRisk: atRiskRows
      .filter(({ id }) => {
        return open.has(id);
      })
      .map(({ id, name, streak: { count, unit } }) => {
        return { id, name, count, unit };
      }),
    continuing: continuingStreaks(done, open),
  });
};
