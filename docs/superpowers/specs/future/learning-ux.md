# Future path: the learning experience and UI

Proposal, 2026-10-13. Effort in agent sessions: S = under one, M = one, L = several. Owner time in Aydin's minutes.

## Thesis

The drills and the feedback content are right; the losses are in the flow around them. A ten-question Say session takes 31 taps, because every right answer gets its own screen. A few flow bugs write wrong data into the star log. And a cleared star never returns, so "cleared" means "right twice in ten minutes," not "remembered next week." The plan: one tap per answer, plug the leaks, schedule cleared kinds to return, close the session well. Voice answers fail on iOS exactly where installing Napkin puts him, so they get a phone test first. (Findings: every tab walked at 390×844, light and dark.)

## Candidate features, ranked

### 1. One tap per answer, and a miss screen that can't corrupt the log (M)

**User sees:** after a right answer, the next question appears at once, under a one-line note: "✓ Last one: 10 · 4.1s". Misses keep today's full screen.

**Why:** Say mode is Reveal → Yes → a near-copy of the reveal → Next (`web/app.js` 692–792). Feedback pays off most after errors ([Metcalfe](https://wesleyan.edu/ofcd/resources/OFCD%20Resource%20Docs/Learning%20from%20Errors.pdf)). Confirmed bugs:
- Method → Back from a miss calls `grade()` again (app.js:788): each round trip logs another miss (attempts went 1 → 2).
- In-session, the lesson's main button "Try three, typed" sets `session = null` (app.js:567), dropping the session with no summary.
- Starred questions show a "starred" tag instead of "End early" (app.js:671): no way out.
- Back or swipe-back mid-session drops to Today and the day isn't counted (app.js:1052).
- With one priority set, "Start today's 10" serves 6 questions (60% per-set cap, `web/priorities.js:61`).

**Owner** 5 min · **Risk** less working shown on right answers · **Needs** nothing.

### 2. Cleared stars come back on a schedule (M)

**User sees:** "Star cleared. It comes back in 3 days to check it stuck." At most 3 returning kinds per session, after the starred ones. Progress lists them ("Half-pot bets · in 4 days").

**Why:** a star clears after two right in a row (`web/store.js:60`), and with "Try one like it now" both can land in one session. That is massed practice (back-to-back repetition), which fades; spaced repetition (returning after growing gaps) sticks. In [Cepeda et al. 2008](https://pubmed.ncbi.nlm.nih.gov/19076480/) the best gap was about 20–40% of how long you must remember it, for a one-week horizon. Proposal: return after 3, 7, then 21 days. A right answer moves it to the next gap; a miss stars it again. With an interview d days away, no gap exceeds 30% of d. "Two in a row" is unchanged. A pure function over the attempt log (new `web/review.js`, like `rebuildStars` in `web/sync.js`) computes it, so sync needs nothing new.

**Owner** 0 (approve gaps) · **Risk** more repetition; the cap keeps 70% new · **Needs** nothing.

### 3. A summary that closes the session (S)

**User sees:** "7 of 10" with no adjective. "Missed today" in session order, each with its answer and method, for one last say-through. "Tomorrow starts with 3 starred and 1 due back." Main button "Done for today", second button "5 more".

**Why:** the rank word reads "Good" even at 0 of 10 (app.js:819). "Starred for next time" mixes in old stars and omits answers. "Again" as the main button pushes a second session, against "short sessions he'll actually do."

**Owner** 0 · **Risk** low · **Needs** 2, for "due back".

### 4. Keep progress safe and get a reminder, with no server (S)

**User sees:** after session two, a one-time card. iPhone Safari: "Add Napkin to your Home Screen so Safari can't clear your progress." On Chrome: an Install button. Under Priorities: "Add a daily reminder to my calendar", downloading an .ics file (a standard calendar invite) for a daily 10-minute event at his chosen moment.

**Why:**
- Safari can delete a site's data after seven days unused; Home Screen web apps are counted separately ([WebKit](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). Signed-out club members are exposed.
- Since iOS 26, any site added to the Home Screen opens as a web app ([WebKit](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)).
- iPhone web push works only from the Home Screen (iOS 16.4+), only after a tap ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)), and needs a push server and scheduler. A calendar event needs none.

**Owner** 5 min · **Risk** .ics handling varies; test on his iPhone · **Needs** nothing.

### 5. Accessibility fixes (S)

WCAG, the web accessibility standard, wants 4.5:1 contrast for small text and 3:1 for control edges.
- **Live region.** `<main aria-live="polite">` (`web/index.html:17`) makes screen readers read every screen in full. Announce only the verdict, in a small live region (an area whose changes are read aloud).
- **Disabled buttons** look tappable (onboarding's Next with nothing picked).
- **Locked cards.** `opacity: 0.8` on them (`web/style.css:140`) drops their grey text to 3.2:1 in light mode and 4.3:1 in dark.
- **Control edges.** Empty progress segments are 1.07:1 and input edges 1.2:1 ([WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)). Draw them with the existing `--muted` token.
- **Tap targets.** Chips are 32 px tall and in-session links 40 px. Pad the tap areas to Apple's 44 pt.
- **Placement clock.** The test's 20-second limit is invisible, though its spec says "the clock is visible per item" ([WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)).
- Reduced motion is already handled.

**Owner** 0 · **Risk** low · **Needs** nothing.

### 6. Plain-words pass (S)

- **Stale text.** About says "Nothing is sent anywhere. No account" (app.js:588), false since sync shipped. "Stats page", "Glossary on the home screen" and "Levels screen" point to screens that have moved.
- **"Check" has four meanings:** a button, the first-run test, the Sunday test and the level tests.
- **Two ladders on Progress.** Set rungs (8 steps) and drill levels (5 steps) share names, and "Solid" means something different in each. Show rungs only.
- **"Start today's 10".** Ten what? Say "10 questions · about 5 min". Onboarding asks for minutes but then sets a question count.
- **Onboarding badge.** Unpicked, it is an empty grey pill that reads as a minus sign.
- **Today is too long.** It lists every priority set (2.8 screens); the site plan says cards "only when relevant." Move the list to Practice.

**Owner** 5 min (approve names) · **Risk** low · **Needs** nothing.

### 7. Voice answers in Say mode: test before building (S spike, M build)

**User sees:** a mic beside Reveal. He says "thirty-three point three", sees "Heard: 33.3", and it's graded like typing. Unclear audio falls back to self-grading.

**Support, plainly** (via the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)):
- **Chrome:** works, but sends audio to Google's servers. That breaks the "stays in this browser" promise.
- **iPhone Safari tab:** works.
- **iPhone Home Screen web app:** a WebKit engineer said it's [not available](https://bugs.webkit.org/show_bug.cgi?id=225298), and nothing I found since says otherwise; [Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) only restricted it to secure pages.
- **Firefox:** not supported.

On his iPhone it clashes with feature 4. Upside: it ends the soft self-grading Progress already flags.

**Owner** 10 min (try it in Safari and from the Home Screen) · **Risk** misheard numbers, privacy · **Needs** a passing phone test.

## Recommended first slice: feature 1, plus the stale text from 6

One agent session. It passes when:
1. "Yes, I had it" and a right typed answer show the next question at once. Ten all-Yes Say questions take 21 taps from Start to summary (31 today).
2. A line above the next question confirms the last answer ("✓ Last one: 10 · 4.1s"), and a live region announces it.
3. Misses (Say "No", wrong typed, "I don't know this") keep today's feedback screen.
4. Method → Back from a miss leaves the stored attempt count and the "x / 10" counter unchanged.
5. In-session, the lesson's main button is "Back to the question"; nothing there ends the session.
6. "End early" shows on every question.
7. Back or swipe-back with at least one answer shows the summary, and counts the day at 5+ answers.
8. With one priority set, "Start today's 10" serves 10 questions. A new test in `tests/web/priorities.test.mjs` covers it.
9. The About privacy line and the three moved-screen names are fixed.
10. `npm test` passes; an automated browser walk (Playwright) at 390×844, light and dark, is attached to the PR.

Owner: one Say session on his phone, 5 minutes.

## What not to do

- No streak freezes, gems, confetti, default sound, or leaderboards outside clubs.
- No auto-advance timers; they fight screen readers.
- Don't force "Try one like it now" (Phase 3 decided against it).
- No web push or voice build before their cheaper tests.
- No new colours.
- Don't change "two clean reps in a row." Spacing comes after a star clears.

## Open questions for Aydin

1. Cleared kinds return after 3, 7 and 21 days, at most 3 per session. OK?
2. Should the summary's main button be "Done for today" instead of "Again"?
3. Rename the tests "Placement", "Sunday score" and "Level test", keeping "Check" only for the button?
