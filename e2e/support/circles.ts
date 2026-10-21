import { adminClient } from '@e2e/support/data';

// Setup for the Circles specs. It writes straight to the database with the service role, which is how a second
// person's circles, habits and shares exist without a second browser. Never import this from application code.

/** A second person, made directly. Their tag comes from the profile trigger. */
export const makeFriend = async (label: string): Promise<string> => {
  const { data, error } = await adminClient().auth.admin.createUser({
    email: `${label}-${crypto.randomUUID().slice(0, 8)}@circles.test`,
    email_confirm: true,
    user_metadata: { full_name: label },
  });

  if (error) {
    throw error;
  }

  return data.user.id;
};

/** A second person who can sign in, so a spec can open a second browser session as them. */
export const makeLoginFriend = async (label: string): Promise<{ id: string; email: string; password: string }> => {
  const email = `${label}-${crypto.randomUUID().slice(0, 8)}@circles.test`;
  const password = 'friend-password-123!';
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: label },
  });

  if (error) {
    throw error;
  }

  return { id: data.user.id, email, password };
};

/** A circle with its owner and members, made directly. */
export const makeCircle = async (name: string, ownerId: string, memberIds: string[]): Promise<string> => {
  const admin = adminClient();
  const { data, error } = await admin.from('circles').insert({ name, owner_id: ownerId }).select('id').single();

  if (error) {
    throw error;
  }

  const { error: memberError } = await admin.from('circle_members').insert(
    [ownerId, ...memberIds].map(user_id => {
      return { circle_id: data.id, user_id };
    }),
  );

  if (memberError) {
    throw memberError;
  }

  return data.id;
};

/** A daily habit for any person, with the ticks given (dates). */
export const seedHabitFor = async (o: {
  userId: string;
  name: string;
  startDate: string;
  icon?: string;
  ticks?: string[];
}): Promise<string> => {
  const admin = adminClient();
  const { userId, name, startDate, icon, ticks } = o;
  const { data, error } = await admin
    .from('habits')
    .insert({ user_id: userId, name, icon: icon ?? '📖', color: 'moss', start_date: startDate })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  const { error: scheduleError } = await admin
    .from('habit_schedules')
    .insert({ habit_id: data.id, kind: 'daily', effective_from: startDate });

  if (scheduleError) {
    throw scheduleError;
  }

  if (ticks?.length) {
    const { error: tickError } = await admin.from('habit_completions').insert(
      ticks.map(completion_date => {
        return { habit_id: data.id, completion_date };
      }),
    );

    if (tickError) {
      throw tickError;
    }
  }

  return data.id;
};

export const shareHabit = async (o: {
  habitId: string;
  circleId: string;
  level: 'showed_up' | 'done_today' | 'streaks' | 'everything';
  label?: 'name' | 'emoji' | 'generic';
}): Promise<void> => {
  const { habitId, circleId, level, label } = o;
  const { error } = await adminClient()
    .from('habit_shares')
    .insert({ habit_id: habitId, circle_id: circleId, level, label: label ?? 'name' });

  if (error) {
    throw error;
  }
};

/** Removes what a spec made: the circles first (an emptied circle would otherwise pass to the e2e user), then the people. */
export const cleanUp = async (made: { circles: string[]; users: string[] }): Promise<void> => {
  const admin = adminClient();

  if (made.circles.length) {
    await admin.from('circles').delete().in('id', made.circles);
  }

  for (const id of made.users) {
    await admin.auth.admin.deleteUser(id);
  }
};

/** Removes every circle whose name starts with the prefix: the ones a spec made by clicking through the screens. */
export const cleanUpByName = async (prefix: string): Promise<void> => {
  await adminClient().from('circles').delete().like('name', `${prefix}%`);
};
