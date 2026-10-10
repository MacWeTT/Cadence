import { useMemo } from 'react';
import { chooseGreeting, dayPart, type Greeting, type GreetingContext } from '@/lib/greeting';

const sessionStore = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null; // blocked storage can throw even on access
  }
};

/** The greeting for this visit, or `null` until the clock is known. Stable while the day part and state are unchanged. */
export function useGreeting(ctx: GreetingContext | null): Greeting | null {
  const part = ctx && dayPart(ctx.hour);
  const state = ctx && `${ctx.allDone}:${ctx.noneDone}:${ctx.weekday}:${ctx.name}:${ctx.hour >= 12}`;
  // Picking is idempotent (the stored choice wins on a repeat), so it is safe in a memo even when React runs it twice.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `ctx` is summarised by `part` and `state`
  return useMemo(() => (ctx ? chooseGreeting(ctx, Math.random, sessionStore()) : null), [part, state]);
}
