-- Links on a habit (0.5): up to 10 web addresses, opened together from the habit's row. Additive.

-- A check constraint cannot hold a subquery, so "every link is a web address" lives in a function.
create function public.all_web_links(p_links text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(l ~ '^https?://[^\s]+$' and length(l) <= 2048), true) from unnest(p_links) as l
$$;

alter table public.habits add column links text[] not null default '{}';
alter table public.habits add constraint habits_links_check check (
  cardinality(links) <= 10 and public.all_web_links(links)
);
