// Runs every supabase/*.sql file in a real Postgres (PGlite, in Node) with a small stand-in for Supabase's auth schema,
// then calls the functions as a leader, members, an outsider, and an anonymous visitor.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const FILES = ["schema.sql", "clubs.sql", "clubs_sets.sql", "foundation.sql"];
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const U = { L: id(1), A: id(2), B: id(3), C: id(4), D: id(5), E: id(6), F: id(7), G: id(8), X: id(9), ADMIN: id(10), TEST: id(11) };

async function as(who, sql, params = []) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${who ? "authenticated" : "anon"}`);
    if (who) await db.query("select set_config('request.jwt.claim.sub', $1, true)", [U[who]]);
    const r = await db.query(sql, params);
    await db.exec("commit");
    return r.rows;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const asFails = async (who, sql, params, pattern) => assert.rejects(() => as(who, sql, params), pattern);

// Answers on distinct local days: k days back at noon-ish, always before today in Indiana time.
const DAY = 86400;
const now = Date.now() / 1000;
const att = (n, o = {}) => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, drill: o.drill ?? "percent_of", family: "percent_of", correct: o.correct ?? i % 2 === 0, seconds: 4, mode: "type",
  ts: now - DAY * ((o.daysBack ?? 1) + (o.spread ? i : 0)) - 12 * 3600, ...(o.club ? { club_session: o.club } : {}) }));
const setProgress = (who, data) => as(who, "insert into progress (user_id, data) values ($1, $2) on conflict (user_id) do update set data = excluded.data", [U[who], JSON.stringify(data)]);

let c1, c2;
before(async () => {
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;`);
  for (const f of FILES) await db.exec(readFileSync(new URL(`../../supabase/${f}`, import.meta.url), "utf8"));
  for (const [k, v] of Object.entries(U)) await db.query("insert into auth.users values ($1, $2)", [v, `${k}@x.test`]);
  c1 = (await as("L", "select * from create_cohort('Pilot Club', 'PILOT-1')"))[0].id;
  c2 = (await as("X", "select * from create_cohort('Other Club', 'OTHER-2')"))[0].id;
  await as("L", "select * from create_club_session($1, 'quick', 42, 'AAAA')", [c1]);
  await as("X", "select * from create_club_session($1, 'poker', 43, 'BBBB')", [c2]);
});

test("every SQL file runs, twice, without error", async () => {
  for (const f of FILES.slice(2)) await db.exec(readFileSync(new URL(`../../supabase/${f}`, import.meta.url), "utf8"));
});

test("membership only through join_cohort; direct reads never loop", async () => {
  await as("A", "select * from join_cohort('pilot-1')");
  await asFails("B", "insert into cohort_members (cohort_id, user_id) values ($1, $2)", [c2, U.B], /row-level security|permission/);
  const sess = await as("A", "select short_code from club_sessions");
  assert.deepEqual(sess.map((r) => r.short_code), ["AAAA"], "a member sees only their own club's sessions");
  assert.equal((await as("A", "select id from cohorts")).length, 1);
  assert.equal((await as("A", "select user_id from cohort_members")).length, 1, "a member sees only their own row");
  assert.ok((await as("L", "select user_id from cohort_members")).length >= 2, "the leader sees who is in the club");
  assert.equal((await as(null, "select id from cohorts")).length, 0);
});

test("summary: the floor holds at four active members besides the leader", async () => {
  for (const m of ["B", "C", "D"]) await as(m, "select * from join_cohort('PILOT-1')");
  await setProgress("L", { attempts: att(9, { spread: true }) });
  for (const m of ["A", "B", "C", "D"]) await setProgress(m, { attempts: att(6) });
  const s = (await as("L", "select cohort_summary($1) s", [c1]))[0].s;
  assert.equal(s.floor, true);
  assert.equal(s.members, 4, "members counts people other than the leader");
  assert.equal(s.active_7d, undefined, "nothing else is returned below the floor");
  await asFails("A", "select cohort_summary($1)", [c1], /only the club leader/);
});

test("summary: real numbers at five, malformed rows skipped, only this club's sessions, small drills hidden", async () => {
  await as("E", "select * from join_cohort('PILOT-1')");
  await as("F", "select * from join_cohort('PILOT-1')");
  await setProgress("A", { attempts: [...att(6, { spread: true }), { ts: "soon", drill: "x" }, "junk", { drill: "percent_of", correct: false, ts: 1e300 }] });
  await setProgress("B", { attempts: att(4, { club: "AAAA" }) });
  await setProgress("C", { attempts: att(4, { club: "BBBB" }) });
  await setProgress("E", { attempts: { not: "an array" } });
  await setProgress("F", { attempts: [...att(3, { drill: "rare_drill", correct: false }), ...att(2)] });
  const s = (await as("L", "select cohort_summary($1) s", [c1]))[0].s;
  assert.equal(s.floor, false);
  assert.equal(s.members, 6);
  assert.equal(s.active_7d, 5, "A, B, C, D, F answered; E's data is malformed; the leader is not counted");
  assert.equal(s.club_session_done, 1, "only B ran this club's session; C ran another club's");
  assert.equal(s.returned_5_days, 1, "only A answered on five or more days");
  assert.ok(!s.top_missed.some((t) => t.drill === "rare_drill"), "a drill only one person tried is not shown");
  assert.ok(s.top_missed.some((t) => t.drill === "percent_of"));
  assert.match(s.through, /^\d{4}-\d{2}-\d{2}$/);
});

test("leaderboard survives a malformed row", async () => {
  await as("L", "select set_cohort_flags($1, null, true)", [c1]);
  await as("A", "select set_board_opt_in($1, true, 'Ann')", [c1]);
  const rows = await as("B", "select * from cohort_leaderboard($1)", [c1]);
  assert.ok(Array.isArray(rows));
  assert.equal((await as(null, "select * from cohort_leaderboard($1)", [c1])).length, 0, "an anonymous visitor gets nothing");
  assert.equal((await as("X", "select * from cohort_leaderboard($1)", [c1])).length, 0, "a non-member gets nothing");
});

test("owner numbers: admins only, totals only, test accounts left out", async () => {
  await asFails(null, "select owner_metrics()", [], /not available|permission/);
  await asFails("A", "select owner_metrics()", [], /not available/);
  await db.query("insert into app_admins values ($1)", [U.ADMIN]);
  await db.query("insert into metrics_excluded values ($1)", [U.TEST]);
  await setProgress("TEST", { attempts: att(20, { spread: true }) });
  const m = (await as("ADMIN", "select owner_metrics() m"))[0].m;
  // With progress: L, A, B, C, D, F (E malformed has no answers; TEST excluded).
  assert.equal(m.practised_all, 6);
  assert.equal(m.active_7d, 6);
  assert.equal(m.days5_all, 2, "L (9 days) and A (6 days)");
  assert.equal(m.days2_all, 2);
  assert.ok(m.sessions_7d >= 6);
  assert.equal(m.clubs.length, 1, "only clubs with five or more active members besides the leader");
  assert.equal(m.clubs[0].name, "Pilot Club");
  assert.ok(Array.isArray(m.retention));
  assert.equal((await as("ADMIN", "select * from app_admins")).length, 0, "the admin list is not readable through the API");
  await asFails("A", "insert into app_admins values ($1)", [U.A], /row-level security|permission/);
});
