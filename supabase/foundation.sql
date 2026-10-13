-- Foundation fixes. Run once in the Supabase SQL editor, after clubs.sql and clubs_sets.sql. Safe to run twice.
-- 1. Club policies that cannot loop into each other or be bypassed (membership only through join_cohort).
-- 2. A leader summary that works: one read-only query, malformed rows skipped, the leader not counted
--    toward the five-member floor, only this club's sessions counted, full days through yesterday.
-- 3. A leaderboard that a malformed row cannot break.
-- 4. owner_metrics(): totals across all accounts, for accounts listed in app_admins only.
-- No progress data is changed. The editor will warn about drops: only policies and helper functions are replaced.

-- ---------- helpers ----------
-- A number from text, or null when the text is not a plain number. Keeps one bad row from breaking a query.
create or replace function public.try_num(t text) returns numeric language sql immutable as $$
  select case when t ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then t::numeric end
$$;

-- Membership checks that run with the definer's rights, so policies can use them without reading each other's tables.
create or replace function public.is_cohort_member(p_cohort uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.cohort_members where cohort_id = p_cohort and user_id = auth.uid())
$$;
create or replace function public.is_cohort_owner(p_cohort uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.cohorts where id = p_cohort and owner_id = auth.uid())
$$;

-- A member's answers as rows, skipping anything that is not a well-formed answer.
create or replace function public.member_attempts(p_user uuid)
returns table (drill text, correct boolean, mode text, ts numeric, club text)
language sql security definer set search_path = public stable as $$
  select a->>'drill', (a->>'correct') = 'true', a->>'mode', public.try_num(a->>'ts'), a->>'club_session'
  from public.progress p
  cross join lateral jsonb_array_elements(case when jsonb_typeof(p.data->'attempts') = 'array' then p.data->'attempts' else '[]'::jsonb end) a
  where p.user_id = p_user and jsonb_typeof(a) = 'object'
    and public.try_num(a->>'ts') between 1 and 10000000000
$$;
revoke execute on function public.member_attempts(uuid) from public, anon, authenticated;

-- ---------- policies ----------
drop policy if exists "cohorts: member read" on public.cohorts;
create policy "cohorts: member read" on public.cohorts for select using (public.is_cohort_member(id));

drop policy if exists "members: own row" on public.cohort_members;
drop policy if exists "members: own read" on public.cohort_members;
drop policy if exists "members: own delete" on public.cohort_members;
drop policy if exists "members: owner read" on public.cohort_members;
create policy "members: own read" on public.cohort_members for select using (auth.uid() = user_id);
create policy "members: own delete" on public.cohort_members for delete using (auth.uid() = user_id);
create policy "members: owner read" on public.cohort_members for select using (public.is_cohort_owner(cohort_id));
-- No insert or update policy: joining goes through join_cohort, board settings through set_board_opt_in.

drop policy if exists "sessions: member read" on public.club_sessions;
drop policy if exists "sessions: owner insert" on public.club_sessions;
create policy "sessions: member read" on public.club_sessions for select using (public.is_cohort_member(cohort_id));
create policy "sessions: owner insert" on public.club_sessions for insert with check (public.is_cohort_owner(cohort_id));

-- ---------- leader summary ----------
-- Seven numbers over the last seven full days (through yesterday, Indiana time), members other than the leader only.
-- Below five active members, only the member count is returned. Drills and sets tried by fewer than five people are left out.
create or replace function public.cohort_summary(p_cohort uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare
  leader uuid; tz text := 'America/Indiana/Indianapolis';
  day_end timestamptz; day_start timestamptz; result jsonb;
begin
  select owner_id into leader from public.cohorts where id = p_cohort;
  if leader is null or leader <> auth.uid() then raise exception 'only the club leader can see the summary'; end if;
  day_end := date_trunc('day', now() at time zone tz) at time zone tz;
  day_start := day_end - interval '7 days';
  with mem as (select user_id from public.cohort_members where cohort_id = p_cohort and user_id <> leader),
  win as (
    select m.user_id, a.drill, a.correct, a.mode, a.club, (to_timestamp(a.ts) at time zone tz)::date as d
    from mem m cross join lateral public.member_attempts(m.user_id) a
    where to_timestamp(a.ts) >= day_start and to_timestamp(a.ts) < day_end),
  active as (select distinct user_id from win),
  drills as (
    select drill, count(*) filter (where not correct) misses, count(*) tries
    from win group by drill having count(distinct user_id) >= 5 and count(*) filter (where not correct) > 0
    order by misses desc limit 3),
  stamps as (
    select s.key as set_id, round(avg(public.try_num(s.value->>'rung')), 1) avg_rung
    from mem m join public.progress p on p.user_id = m.user_id
    cross join lateral jsonb_each(case when jsonb_typeof(p.data->'stamps') = 'object' then p.data->'stamps' else '{}'::jsonb end) s
    where jsonb_typeof(s.value) = 'object' and public.try_num(s.value->>'rung') is not null
    group by s.key having count(*) >= 5)
  select jsonb_build_object(
    'members', (select count(*) from mem),
    'floor', (select count(*) from active) < 5,
    'active_7d', (select count(*) from active),
    'attempts_7d', (select count(*) from win),
    'typed_accuracy_7d', (select round(100.0 * avg(case when correct then 1 else 0 end)) from win where mode in ('type', 'diag', 'check')),
    'returned_5_days', (select count(*) from (select user_id from win group by user_id having count(distinct d) >= 5) r),
    'top_missed', (select coalesce(jsonb_agg(jsonb_build_object('drill', drill, 'misses', misses, 'tries', tries) order by misses desc), '[]'::jsonb) from drills),
    'club_session_done', (select count(distinct user_id) from win where club in (select short_code from public.club_sessions where cohort_id = p_cohort)),
    'avg_level_by_set', (select coalesce(jsonb_object_agg(set_id, avg_rung), '{}'::jsonb) from stamps),
    'through', to_char(day_end - interval '1 day', 'YYYY-MM-DD'))
  into result;
  if (result->>'floor')::boolean then
    return jsonb_build_object('members', result->'members', 'floor', true, 'through', result->'through');
  end if;
  return result;
end $$;

-- ---------- leaderboard ----------
create or replace function public.cohort_leaderboard(p_cohort uuid)
returns table (first_name text, score integer)
language sql security definer set search_path = public stable as $$
  select m.first_name, count(*) filter (where a.correct and a.mode in ('type', 'diag', 'check'))::int
  from public.cohort_members m
  cross join lateral public.member_attempts(m.user_id) a
  where m.cohort_id = p_cohort and m.board_opt_in and m.first_name is not null
    and to_timestamp(a.ts) >= now() - interval '7 days' and to_timestamp(a.ts) <= now() + interval '1 hour'
    and exists (select 1 from public.cohorts c where c.id = p_cohort and c.leaderboard)
    and public.is_cohort_member(p_cohort)
  group by m.user_id, m.first_name order by 2 desc limit 10
$$;

-- ---------- owner numbers ----------
-- Accounts allowed to call owner_metrics, and accounts left out of every count (test accounts).
-- Nobody can read or write these through the app; add rows here in the SQL editor.
create table if not exists public.app_admins (user_id uuid primary key references auth.users (id) on delete cascade);
create table if not exists public.metrics_excluded (user_id uuid primary key references auth.users (id) on delete cascade);
alter table public.app_admins enable row level security;
alter table public.metrics_excluded enable row level security;

-- Totals across signed-in accounts. Never one person's answers. A practice day is a local day with at least one answer.
create or replace function public.owner_metrics()
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare tz text := 'America/Indiana/Indianapolis'; today date; result jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.app_admins where user_id = auth.uid()) then
    raise exception 'not available';
  end if;
  today := (now() at time zone tz)::date;
  with users as (
    select p.user_id from public.progress p where p.user_id not in (select user_id from public.metrics_excluded)),
  att as (
    select u.user_id, a.ts, (to_timestamp(a.ts) at time zone tz)::date d
    from users u cross join lateral public.member_attempts(u.user_id) a),
  firsts as (select user_id, min(d) first_day from att group by user_id),
  days as (select distinct user_id, d from att),
  sess as (
    select user_id, ts, case when lag(ts) over (partition by user_id order by ts) is null
      or ts - lag(ts) over (partition by user_id order by ts) > 1800 then 1 else 0 end starts
    from att),
  week_sessions as (select user_id, sum(starts) n from sess where to_timestamp(ts) >= now() - interval '7 days' group by user_id),
  week_days as (select user_id, count(*) n from days where d > today - 7 group by user_id),
  cohorts_by_week as (
    select date_trunc('week', first_day)::date wk, user_id, first_day from firsts where first_day > today - 63),
  retention as (
    select wk, count(*) n,
      count(*) filter (where exists (select 1 from days x where x.user_id = c.user_id and x.d between c.first_day + 7 and c.first_day + 13)) w1,
      count(*) filter (where exists (select 1 from days x where x.user_id = c.user_id and x.d between c.first_day + 14 and c.first_day + 20)) w2,
      count(*) filter (where exists (select 1 from days x where x.user_id = c.user_id and x.d between c.first_day + 28 and c.first_day + 34)) w4
    from cohorts_by_week c group by wk),
  clubs as (
    select c.name,
      (select count(*) from public.cohort_members m where m.cohort_id = c.id and m.user_id <> c.owner_id and m.user_id in (select user_id from users)) members,
      (select count(distinct a.user_id) from att a join public.cohort_members m on m.user_id = a.user_id and m.cohort_id = c.id where m.user_id <> c.owner_id and a.d > today - 7) active_7d,
      (select count(*) from (select a.user_id from days a join public.cohort_members m on m.user_id = a.user_id and m.cohort_id = c.id where m.user_id <> c.owner_id and a.d > today - 28 group by a.user_id having count(*) >= 5) z) days5_28
    from public.cohorts c)
  select jsonb_build_object(
    'practised_all', (select count(*) from firsts),
    'new_7d', (select count(*) from firsts where first_day > today - 7),
    'active_7d', (select count(distinct user_id) from days where d > today - 7),
    'active_28d', (select count(distinct user_id) from days where d > today - 28),
    'days2_all', (select count(*) from (select user_id from days group by user_id having count(*) >= 2) z),
    'days5_all', (select count(*) from (select user_id from days group by user_id having count(*) >= 5) z),
    'days5_28d', (select count(*) from (select user_id from days where d > today - 28 group by user_id having count(*) >= 5) z),
    'sessions_7d', (select coalesce(sum(n), 0) from week_sessions),
    'median_sessions_7d', (select percentile_cont(0.5) within group (order by n) from week_sessions),
    'median_days_7d', (select percentile_cont(0.5) within group (order by n) from week_days),
    'retention', (select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'n', n, 'w1', w1, 'w2', w2, 'w4', w4) order by wk desc), '[]'::jsonb) from retention),
    'clubs', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'members', members, 'active_7d', active_7d, 'days5_28d', days5_28) order by name), '[]'::jsonb) from clubs where active_7d >= 5),
    'as_of', to_char(today, 'YYYY-MM-DD'))
  into result;
  return result;
end $$;
