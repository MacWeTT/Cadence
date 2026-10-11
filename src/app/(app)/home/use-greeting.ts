import { useMemo } from 'react';
import { chooseGreeting, dayPart, type Greeting, type GreetingContext } from '@/lib/greeting';

const sessionStore = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null; // blocked storage can throw even on access
  }
};

/** What the greeting depends on besides the hour, as one string: it changes when the greeting should. */
const stateKey = (ctx: GreetingContext) => {
  const { allDone, noneDone, weekday, name, hour } = ctx;

  return `${allDone}:${noneDone}:${weekday}:${name}:${hour >= 12}`;
};

/** The greeting for this visit, or `null` until the clock is known. Stable while the day part and state are unchanged. */
export const useGreeting = (ctx: GreetingContext | null): Greeting | null => {
  const part = ctx && dayPart(ctx.hour);
  const state = ctx && stateKey(ctx);

  // Picking is idempotent (the stored choice wins on a repeat), so it is safe in a memo even when React runs it twice.
  return useMemo(() => {
    return ctx ? chooseGreeting(ctx, Math.random, sessionStore()) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ctx` is summarised by `part` and `state`
  }, [part, state]);
};
