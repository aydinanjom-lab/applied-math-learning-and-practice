-- Club question sets. Run once in the Supabase SQL editor, after clubs.sql.
-- Adds a list of set ids to each club, returns it to members, and lets the leader change it.
-- Safe to run twice. The drops only remove functions whose return shape changes; no table data is touched.

alter table public.cohorts add column if not exists sets text[] not null default '{}';
alter table public.cohorts drop constraint if exists cohorts_sets_check;
alter table public.cohorts add constraint cohorts_sets_check
  check (cardinality(sets) <= 8 and array_to_string(sets, ',') ~ '^[a-z0-9,]*$');

drop function if exists public.my_cohorts();
create function public.my_cohorts()
returns table (id uuid, name text, code text, hide_betting boolean, leaderboard boolean, is_owner boolean, board_opt_in boolean, first_name text, members integer, sets text[], joined_at timestamptz)
language sql security definer set search_path = public stable as $$
  select c.id, c.name, c.code, c.hide_betting, c.leaderboard, c.owner_id = auth.uid(),
         coalesce(m.board_opt_in, false), m.first_name,
         (select count(*)::int from public.cohort_members x where x.cohort_id = c.id),
         c.sets, m.joined_at
  from public.cohorts c
  left join public.cohort_members m on m.cohort_id = c.id and m.user_id = auth.uid()
  where c.owner_id = auth.uid() or m.user_id is not null
  order by c.created_at;
$$;

drop function if exists public.join_cohort(text);
create function public.join_cohort(p_code text)
returns table (id uuid, name text, code text, hide_betting boolean, leaderboard boolean, is_owner boolean, sets text[])
language plpgsql security definer set search_path = public as $$
declare c public.cohorts%rowtype;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into c from public.cohorts where cohorts.code = upper(trim(p_code));
  if not found then raise exception 'no club with that code'; end if;
  insert into public.cohort_members (cohort_id, user_id) values (c.id, auth.uid()) on conflict do nothing;
  return query select c.id, c.name, c.code, c.hide_betting, c.leaderboard, c.owner_id = auth.uid(), c.sets;
end $$;

-- Leader only: replace the club's sets. The app sends known set ids; the check constraint rejects anything else.
create or replace function public.set_cohort_sets(p_cohort uuid, p_sets text[])
returns void language sql security definer set search_path = public as $$
  update public.cohorts set sets = coalesce(p_sets, '{}') where id = p_cohort and owner_id = auth.uid();
$$;
