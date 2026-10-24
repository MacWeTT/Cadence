-- Circles: who showed up today, across all your circles, for the line on Home ("Sam and Priya showed up today").
--
-- A friend counts when they have a tick today (in their own timezone) on a habit they share with you at Showed up or
-- higher, in any circle you are both in. The same sharing rules apply as everywhere: a friend who hid the habit from you,
-- who paused sharing, or whose habit is archived is not listed, and you are never listed. It names only people who
-- showed up; there is no way to ask who did not. A friend in two of your circles is one row.

create function public.circles_showed_up_today()
returns table (user_id uuid, tag text, display_name text)
language sql stable security definer set search_path = '' as $$
  select distinct on (p.user_id) p.user_id, p.tag, p.display_name
  from public.circle_members me
  join public.circle_members m on m.circle_id = me.circle_id and m.user_id <> me.user_id
  join public.profiles p on p.user_id = m.user_id and not p.circles_paused
  join public.habits h on h.user_id = m.user_id and h.archived_at is null
  join public.habit_shares s on s.habit_id = h.id and s.circle_id = me.circle_id
  left join public.habit_share_overrides o
    on o.habit_id = h.id and o.circle_id = me.circle_id and o.viewer_id = me.user_id
  join public.habit_completions c
    on c.habit_id = h.id and c.completion_date = (now() at time zone p.timezone)::date
  where me.user_id = (select auth.uid()) and coalesce(o.level, s.level) <> 'hidden'
  order by p.user_id
$$;

revoke execute on function public.circles_showed_up_today() from public, anon;
grant execute on function public.circles_showed_up_today() to authenticated;
