// Makes (or refreshes) a demo account in your LOCAL Supabase, for trying the app by hand: a registered profile with a
// name, a tag and a character avatar, and a few habits with history. It refuses to run against anything but a local
// database. Usage: `npm run seed:demo`, or `npm run seed:demo -- --empty` for the account with no habits (the "PC has data,
// account has none" case of the desktop sync).
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SERVICE_ROLE_KEY: service,
} = process.env;

if (!url || !publishable || !service) {
  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.',
  );
}

if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
  throw new Error(`Refusing to seed ${url}: this only runs against the local database.`);
}

const DEMO = { email: 'demo@cadence.test', password: 'demo-password-123!', tag: 'demo', name: 'Demo User' };
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, service, options);

const day = offset => {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() - offset);

  return date.toISOString().slice(0, 10);
};

const { data: made, error: makeError } = await admin.auth.admin.createUser({
  email: DEMO.email,
  password: DEMO.password,
  email_confirm: true,
  user_metadata: { full_name: DEMO.name },
});

if (makeError && makeError.code !== 'email_exists') {
  throw makeError;
}

let userId = made?.user?.id;

if (!userId) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });

  userId = list.users.find(({ email }) => email === DEMO.email)?.id;
  await admin.auth.admin.updateUserById(userId, { password: DEMO.password });
}

// A registered account with a character avatar, as someone who finished the register screen would have.
const { error: profileError } = await admin
  .from('profiles')
  .update({
    tag: DEMO.tag,
    display_name: DEMO.name,
    registered_at: new Date().toISOString(),
    password_set: true,
    avatar_kind: 'character',
    avatar_value: 'robot',
    avatar_color: '#7c9a6d',
  })
  .eq('user_id', userId);

if (profileError) {
  throw profileError;
}

if (process.argv.includes('--empty')) {
  // the account with nothing in it, even if an earlier run filled it
  const { error } = await admin.from('habits').delete().eq('user_id', userId);

  if (error) {
    throw error;
  }
} else {
  const user = createClient(url, publishable, options);
  const { error: signInError } = await user.auth.signInWithPassword({ email: DEMO.email, password: DEMO.password });

  if (signInError) {
    throw signInError;
  }

  const ticks = (every, days) => {
    return Array.from({ length: days }, (_, index) => index + 1)
      .filter(offset => offset % every !== 0)
      .map(day);
  };
  const session = (offset, minutes) => {
    const start = new Date(`${day(offset)}T09:00:00Z`);

    return {
      startedAt: start.toISOString(),
      endedAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
      mode: 'free',
      plan: null,
      skippedSeconds: 0,
      focusSeconds: minutes * 60,
    };
  };

  const { error } = await user.rpc('replace_my_data', {
    p_backup: {
      app: 'cadence',
      version: 1,
      habits: [
        {
          name: 'Read',
          description: 'Ten pages before bed',
          icon: '📖',
          color: 'moss',
          startDate: day(30),
          createdAt: `${day(30)}T08:00:00Z`,
          links: [],
          archivedAt: null,
          schedules: [{ kind: 'daily', timesPerWeek: null, weekdays: null, effectiveFrom: day(30) }],
          ticks: ticks(7, 29),
          pauses: [],
          focusSessions: [session(2, 25), session(5, 40)],
        },
        {
          name: 'Run',
          description: null,
          icon: '🏃',
          color: 'clay',
          startDate: day(30),
          createdAt: `${day(30)}T09:00:00Z`,
          links: [],
          archivedAt: null,
          schedules: [{ kind: 'weekdays', timesPerWeek: null, weekdays: [1, 3, 5], effectiveFrom: day(30) }],
          ticks: ticks(3, 29),
          pauses: [],
          focusSessions: [],
        },
        {
          name: 'Meditate',
          description: null,
          icon: '🌱',
          color: 'sky',
          startDate: day(14),
          createdAt: `${day(14)}T10:00:00Z`,
          links: [],
          archivedAt: null,
          schedules: [{ kind: 'weekly_count', timesPerWeek: 3, weekdays: null, effectiveFrom: day(14) }],
          ticks: [day(1), day(3), day(6), day(8)],
          pauses: [],
          focusSessions: [session(1, 10)],
        },
      ],
    },
  });

  if (error) {
    throw error;
  }
}

console.log(`Demo account ready: ${DEMO.email} / ${DEMO.password} (tag @${DEMO.tag})`);
