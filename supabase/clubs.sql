-- Clubs. Run once in the Supabase SQL editor, after schema.sql.
-- Three tables, row-level security, and functions that return only aggregates to a club leader.
-- Privacy floor: a leader never gets a select policy on progress; summaries return nulls below five active members.

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[A-Z0-9-]{4,20}$'),
  name text not null check (length(name) between 2 and 60),
  owner_id uuid not null references auth.users (id) on delete cascade,
  hide_betting boolean not null default false,
  leaderboard boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cohort_members (
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  first_name text check (first_name is null or length(first_name) between 1 and 24),
  board_opt_in boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

create table if not exists public.club_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  short_code text unique not null check (short_code ~ '^[A-Z0-9]{4}$'),
  seed integer not null,
  set_id text not null,
  due_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.club_sessions enable row level security;

-- cohorts: owners see and edit their own; members see the clubs they belong to. Lookup by code goes through a function.
drop policy if exists "cohorts: owner all" on public.cohorts;
create policy "cohorts: owner all" on public.cohorts for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "cohorts: member read" on public.cohorts;
create policy "cohorts: member read" on public.cohorts for select using (exists (select 1 from public.cohort_members m where m.cohort_id = id and m.user_id = auth.uid()));

-- cohort_members: you manage your own row; the owner may read who is in (never their progress).
drop policy if exists "members: own row" on public.cohort_members;
create policy "members: own row" on public.cohort_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "members: owner read" on public.cohort_members;
create policy "members: owner read" on public.cohort_members for select using (exists (select 1 from public.cohorts c where c.id = cohort_id and c.owner_id = auth.uid()));

-- club_sessions: members read their club's sessions; the owner creates them. Lookup by short code goes through a function.
drop policy if exists "sessions: member read" on public.club_sessions;
create policy "sessions: member read" on public.club_sessions for select using (exists (select 1 from public.cohort_members m where m.cohort_id = cohort_id and m.user_id = auth.uid()));
drop policy if exists "sessions: owner insert" on public.club_sessions;
create policy "sessions: owner insert" on public.club_sessions for insert with check (exists (select 1 from public.cohorts c where c.id = cohort_id and c.owner_id = auth.uid()));

-- ---------- functions ----------
-- Join by code: returns the club's public card and adds the caller as a member.
create or replace function public.join_cohort(p_code text)
returns table (id uuid, name text, code text, hide_betting boolean, leaderboard boolean, is_owner boolean)
language plpgsql security definer set search_path = public as $$
declare c public.cohorts%rowtype;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into c from public.cohorts where cohorts.code = upper(trim(p_code));
  if not found then raise exception 'no club with that code'; end if;
  insert into public.cohort_members (cohort_id, user_id) values (c.id, auth.uid()) on conflict do nothing;
  return query select c.id, c.name, c.code, c.hide_betting, c.leaderboard, c.owner_id = auth.uid();
end $$;

-- My clubs, with role and my board settings.
create or replace function public.my_cohorts()
returns table (id uuid, name text, code text, hide_betting boolean, leaderboard boolean, is_owner boolean, board_opt_in boolean, first_name text, members integer)
language sql security definer set search_path = public stable as $$
  select c.id, c.name, c.code, c.hide_betting, c.leaderboard, c.owner_id = auth.uid(),
         coalesce(m.board_opt_in, false), m.first_name,
         (select count(*)::int from public.cohort_members x where x.cohort_id = c.id)
  from public.cohorts c
  left join public.cohort_members m on m.cohort_id = c.id and m.user_id = auth.uid()
  where c.owner_id = auth.uid() or m.user_id is not null
  order by c.created_at;
$$;

-- Create a club; the creator is owner and first member.
create or replace function public.create_cohort(p_name text, p_code text)
returns table (id uuid, name text, code text)
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.cohorts (name, code, owner_id) values (trim(p_name), upper(trim(p_code)), auth.uid()) returning cohorts.id into new_id;
  insert into public.cohort_members (cohort_id, user_id) values (new_id, auth.uid());
  return query select c.id, c.name, c.code from public.cohorts c where c.id = new_id;
end $$;

-- Owner toggles.
create or replace function public.set_cohort_flags(p_cohort uuid, p_hide_betting boolean, p_leaderboard boolean)
returns void language sql security definer set search_path = public as $$
  update public.cohorts set hide_betting = coalesce(p_hide_betting, hide_betting), leaderboard = coalesce(p_leaderboard, leaderboard)
  where id = p_cohort and owner_id = auth.uid();
$$;

-- Member: opt in or out of the board with a first name.
create or replace function public.set_board_opt_in(p_cohort uuid, p_opt_in boolean, p_first_name text)
returns void language sql security definer set search_path = public as $$
  update public.cohort_members set board_opt_in = p_opt_in, first_name = case when p_opt_in then left(trim(p_first_name), 24) else null end
  where cohort_id = p_cohort and user_id = auth.uid();
$$;

create or replace function public.leave_cohort(p_cohort uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.cohort_members where cohort_id = p_cohort and user_id = auth.uid()
    and not exists (select 1 from public.cohorts c where c.id = p_cohort and c.owner_id = auth.uid());
$$;

-- Owner deletes the club and everything under it.
create or replace function public.delete_cohort(p_cohort uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.cohorts where id = p_cohort and owner_id = auth.uid();
$$;

-- New club session: a seed and a set. Every phone derives the same ten questions from the seed.
create or replace function public.create_club_session(p_cohort uuid, p_set_id text, p_seed integer, p_short text)
returns table (short_code text, seed integer, set_id text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.cohorts c where c.id = p_cohort and c.owner_id = auth.uid()) then raise exception 'only the club leader can start a session'; end if;
  insert into public.club_sessions (cohort_id, set_id, seed, short_code, created_by) values (p_cohort, p_set_id, p_seed, upper(p_short), auth.uid());
  return query select s.short_code, s.seed, s.set_id from public.club_sessions s where s.short_code = upper(p_short);
end $$;

-- Anyone with the short code can fetch the seed (that is the point of a shared link). Nothing personal is in it.
create or replace function public.club_session_by_code(p_short text)
returns table (short_code text, seed integer, set_id text, club_name text, cohort_id uuid)
language sql security definer set search_path = public stable as $$
  select s.short_code, s.seed, s.set_id, c.name, c.id from public.club_sessions s join public.cohorts c on c.id = s.cohort_id
  where s.short_code = upper(trim(p_short));
$$;

-- Leader summary: seven numbers, aggregates only, nulls below five active members.
create or replace function public.cohort_summary(p_cohort uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare
  n_members int; n_active int; since numeric := extract(epoch from now() - interval '7 days');
  n_attempts int; typed_acc numeric; returned5 int; top_missed jsonb; club_done int; levels jsonb;
begin
  if not exists (select 1 from public.cohorts c where c.id = p_cohort and c.owner_id = auth.uid()) then raise exception 'only the club leader can see the summary'; end if;
  select count(*) into n_members from public.cohort_members m where m.cohort_id = p_cohort;
  -- attempts of members in the last seven days, flattened
  create temp table if not exists _att (user_id uuid, drill text, correct boolean, mode text, ts numeric, club text) on commit drop;
  delete from _att;
  insert into _att
    select m.user_id, a->>'drill', (a->>'correct')::boolean, a->>'mode', (a->>'ts')::numeric, a->>'club_session'
    from public.cohort_members m join public.progress p on p.user_id = m.user_id
    cross join lateral jsonb_array_elements(coalesce(p.data->'attempts', '[]'::jsonb)) a
    where m.cohort_id = p_cohort and (a->>'ts')::numeric >= since;
  select count(distinct user_id) into n_active from _att;
  if n_active < 5 then
    return jsonb_build_object('members', n_members, 'active_7d', null, 'attempts_7d', null, 'typed_accuracy_7d', null, 'returned_5_days', null, 'top_missed', null, 'club_session_done', null, 'avg_level_by_set', null, 'floor', true);
  end if;
  select count(*) into n_attempts from _att;
  select round(100.0 * avg(case when correct then 1 else 0 end), 0) into typed_acc from _att where mode in ('type', 'diag', 'check');
  select count(*) into returned5 from (select user_id from _att group by user_id having count(distinct to_timestamp(ts)::date) >= 5) r;
  select coalesce(jsonb_agg(jsonb_build_object('drill', drill, 'misses', misses, 'tries', tries) order by misses desc), '[]'::jsonb) into top_missed
    from (select drill, count(*) filter (where not correct) misses, count(*) tries from _att group by drill having count(*) filter (where not correct) > 0 order by misses desc limit 3) t;
  select count(distinct user_id) into club_done from _att where club is not null;
  select coalesce(jsonb_object_agg(set_id, avg_rung), '{}'::jsonb) into levels from (
    select s.key set_id, round(avg((s.value->>'rung')::numeric), 1) avg_rung
    from public.cohort_members m join public.progress p on p.user_id = m.user_id
    cross join lateral jsonb_each(coalesce(p.data->'stamps', '{}'::jsonb)) s
    where m.cohort_id = p_cohort group by s.key) l;
  return jsonb_build_object('members', n_members, 'active_7d', n_active, 'attempts_7d', n_attempts, 'typed_accuracy_7d', typed_acc, 'returned_5_days', returned5, 'top_missed', top_missed, 'club_session_done', club_done, 'avg_level_by_set', levels, 'floor', false);
end $$;

-- Leaderboard: top ten by typed correct answers in the last seven days, opted-in members only, when the club has it on.
create or replace function public.cohort_leaderboard(p_cohort uuid)
returns table (first_name text, score integer)
language sql security definer set search_path = public stable as $$
  select m.first_name, count(*) filter (where (a->>'correct')::boolean and a->>'mode' in ('type', 'diag', 'check'))::int score
  from public.cohort_members m join public.progress p on p.user_id = m.user_id
  cross join lateral jsonb_array_elements(coalesce(p.data->'attempts', '[]'::jsonb)) a
  where m.cohort_id = p_cohort and m.board_opt_in and m.first_name is not null
    and (a->>'ts')::numeric >= extract(epoch from now() - interval '7 days')
    and exists (select 1 from public.cohorts c where c.id = p_cohort and c.leaderboard)
    and exists (select 1 from public.cohort_members me where me.cohort_id = p_cohort and me.user_id = auth.uid())
  group by m.user_id, m.first_name order by score desc limit 10;
$$;
