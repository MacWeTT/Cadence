import { REACTIONS, REACTION_DAYS, type Reaction } from '@/domain/circles';
import { addDays, type CalendarDate } from '@/domain/dates';
import type { Streak } from '@/domain/streaks';
import type { CircleMemberView } from '@/server/circles-view';

/** One habit a friend did that day, as far as their level lets you see. */
export interface FeedHabit {
  name: string | null;
  icon: string | null;
  /** Only on the friend's today, at Streaks and above. */
  streak: Streak | null;
}

/** One emoji on a bubble: how many, who gave it (their tags), and whether you did. */
export interface FeedReaction {
  emoji: Reaction;
  count: number;
  mine: boolean;
  who: string[];
}

/** A habit a partner allowed off days for, on a day it didn't happen. */
export interface FeedOff {
  name: string | null;
  icon: string | null;
}

/** A friend's day as one message: what they did, and the reactions it got. */
export interface FeedBubble {
  key: string;
  member: CircleMemberView;
  date: CalendarDate;
  habits: FeedHabit[];
  /** Only for a partner who allowed it, and only on a day they also did something. */
  off: FeedOff[];
  reactions: FeedReaction[];
}

export interface FeedDay {
  date: CalendarDate;
  when: 'today' | 'yesterday' | 'earlier';
  bubbles: FeedBubble[];
}

/** The habits a friend did on `date`: today by the done flag, earlier days by the history shared at Everything. */
const habitsOn = (member: CircleMemberView, date: CalendarDate): FeedHabit[] => {
  const { habits, today } = member;

  return habits
    .filter(({ done, ticks }) => {
      return date === today ? done : (ticks?.includes(date) ?? false);
    })
    .map(({ name, icon, streak }) => {
      return { name, icon, streak: date === today ? streak : null };
    });
};

/** The habits that didn't happen on `date`, where the owner allowed off days for them (otherwise none, ever). */
const offOn = (member: CircleMemberView, date: CalendarDate): FeedOff[] => {
  return member.habits
    .filter(({ missed }) => {
      return missed?.includes(date) ?? false;
    })
    .map(({ name, icon }) => {
      return { name, icon };
    });
};

/** The reactions a day got, grouped by emoji in the usual order. */
const reactionsOn = (member: CircleMemberView, date: CalendarDate, meId: string | null): FeedReaction[] => {
  const given = member.reactions.filter(reaction => {
    return reaction.date === date;
  });

  return REACTIONS.flatMap(emoji => {
    const { who, mine } = given.reduce(
      (found, { emoji: gave, userId, tag }) => {
        const { who: tags, mine: byMe } = found;

        return gave === emoji ? { who: [...tags, tag], mine: byMe || userId === meId } : found;
      },
      { who: [] as string[], mine: false },
    );
    const { length: count } = who;

    return count === 0 ? [] : [{ emoji, count, mine, who }];
  });
};

/** Today and the days before it, oldest first, back as far as a reaction can still be given. */
const daysOf = (today: CalendarDate): CalendarDate[] => {
  return Array.from({ length: REACTION_DAYS + 1 }, (_, back) => {
    return addDays(today, back - REACTION_DAYS);
  });
};

const whenOf = (date: CalendarDate, today: CalendarDate): FeedDay['when'] => {
  if (date >= today) {
    return 'today';
  }

  return date === addDays(today, -1) ? 'yesterday' : 'earlier';
};

/**
 * The circle as a conversation: one bubble per person per day (yours too, as the circle sees it, with the reactions it
 * got), grouped by day, oldest first. Only what people chose to share is in it, and nothing says what was missed; a day with nothing shared has no bubble.
 */
export const buildFeed = (members: CircleMemberView[], today: CalendarDate): FeedDay[] => {
  const meId =
    members.find(({ isYou }) => {
      return isYou;
    })?.userId ?? null;
  const days = new Map<CalendarDate, FeedBubble[]>();

  for (const member of members) {
    const { paused, userId, today: theirToday } = member;

    if (paused) {
      continue;
    }

    for (const date of daysOf(theirToday)) {
      const habits = habitsOn(member, date);

      if (habits.length === 0) {
        continue;
      }

      const bubble = {
        key: `${userId}-${date}`,
        member,
        date,
        habits,
        off: offOn(member, date),
        reactions: reactionsOn(member, date, meId),
      };

      days.set(date, [...(days.get(date) ?? []), bubble]);
    }
  }

  return [...days.entries()]
    .sort(([a], [b]) => {
      return a.localeCompare(b);
    })
    .map(([date, bubbles]) => {
      return { date, when: whenOf(date, today), bubbles };
    });
};
