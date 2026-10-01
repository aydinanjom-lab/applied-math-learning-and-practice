# Turning on accounts and sync (about five minutes)

Sync lets your laptop and your phone share one progress record. Without it, everything still works; progress just stays per browser.

1. Go to supabase.com, sign in with GitHub, and create a new project. Any name, any region near you, free plan.
2. In the project, open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This makes one table and the rules that keep each person's row private.
3. Open **Authentication → Providers → Email**. Leave "Confirm email" on. Turn off "Enable email signups" only if you want to keep the site to yourself; otherwise leave it on.
4. Open **Authentication → URL Configuration**. Set the site URL to the page's address (`https://napkinprep.com/`) and add it to the redirect list, along with any other address the app is served from (the github.io one, a Netlify one). This is where the sign-in email sends people back to.
5. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `web/config.js`:

       export const SUPABASE = { url: "https://xxxx.supabase.co", anonKey: "eyJ..." };

   Both values are meant to be public. What protects your data is the row-level security from step 2, not secrecy of these keys.
6. Commit and push. Netlify redeploys. Open the site, tap **Account** on the home screen, enter your email, and click the link in the email. Do the same on your phone.

**How merging works.** Your list of answers is append-only, so the two devices' lists are combined and sorted by time. Stars, streak days, and levels are recomputed from the combined list rather than copied, which is why nothing can conflict. Your fastest personal best wins. If you sign in on a device that already has progress, that progress is kept and merged in, not replaced.

**If something looks wrong.** The Account screen shows the last sync time and any error. Export from the Stats page before trying anything drastic. To start over on one device only, clear the site's data in that browser; the account copy is untouched.

## Custom domain (napkinprep.com)

GitHub Pages serves the site at the domain. `web/CNAME` carries the name into every deploy. DNS at the registrar:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | aydinanjom-lab.github.io |

Then in the repository: Settings → Pages → Custom domain → `napkinprep.com`, Save, and tick "Enforce HTTPS" once the certificate check passes (a few minutes to an hour). The github.io address redirects to the domain afterwards. Supabase: add `https://napkinprep.com/**` to the redirect list and make it the Site URL, or sign-in links will send people to the old address.

## Clubs (second SQL file)

Run `supabase/clubs.sql` in the SQL Editor the same way as the first file. It adds three tables (clubs, members, club sessions), their row-level security, and the functions the app calls. Every club call goes through a function, so the privacy rules live in one place:

- A leader never has read access to anyone's progress row. The summary function computes aggregates and returns nulls for everything but the member count until five members have practised in the last week.
- The leaderboard is off per club by default, opt-in per member, first names only, typed answers only, top ten, last seven days.
- A club session is a seed and a set id. Every phone derives the same ten questions from the seed; no questions are stored. Anyone with the four-letter code can fetch the seed, which holds nothing personal.
- A "hide betting" flag per club removes the betting set from members' Practice page and from the club-session set picker.

Links: join `https://napkinprep.com/#/join/CLUB-CODE`, session `https://napkinprep.com/#/s/MXQ7`. A join link opened before sign-in holds the code locally and finishes the join after the email link.
