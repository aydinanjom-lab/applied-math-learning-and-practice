# Turning on accounts and sync (about five minutes)

Sync lets your laptop and your phone share one progress record. Without it, everything still works; progress just stays per browser.

1. Go to supabase.com, sign in with GitHub, and create a new project. Any name, any region near you, free plan.
2. In the project, open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This makes one table and the rules that keep each person's row private.
3. Open **Authentication → Providers → Email**. Leave "Confirm email" on. Turn off "Enable email signups" only if you want to keep the site to yourself; otherwise leave it on.
4. Open **Authentication → URL Configuration**. Set the site URL to your Netlify address (for example `https://napkin.netlify.app`) and add the same address to the redirect list. This is where the sign-in email sends people back to.
5. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `web/config.js`:

       export const SUPABASE = { url: "https://xxxx.supabase.co", anonKey: "eyJ..." };

   Both values are meant to be public. What protects your data is the row-level security from step 2, not secrecy of these keys.
6. Commit and push. Netlify redeploys. Open the site, tap **Account** on the home screen, enter your email, and click the link in the email. Do the same on your phone.

**How merging works.** Your list of answers is append-only, so the two devices' lists are combined and sorted by time. Stars, streak days, and levels are recomputed from the combined list rather than copied, which is why nothing can conflict. Your fastest personal best wins. If you sign in on a device that already has progress, that progress is kept and merged in, not replaced.

**If something looks wrong.** The Account screen shows the last sync time and any error. Export from the Stats page before trying anything drastic. To start over on one device only, clear the site's data in that browser; the account copy is untouched.
