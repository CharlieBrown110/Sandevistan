# Typing Tournament App — Build Plan

Nov 10, 2026 · @Bipul Hf

## 1. Overview

Build a Monkeytype-style typing test website where a signed-in user creates an **asynchronous tournament**, shares a link with friends, and everyone is ranked by their **best single attempt** made inside a time window the creator chose. It ships as one Next.js project on Vercel.

**How a tournament works for players**

1. The creator picks a test (for example 60 seconds, English, no punctuation), a minimum accuracy, and when the tournament starts and ends.
2. The creator copies the share link and sends it to friends.
3. Friends sign in, join, and type as many attempts as they like while the tournament is active. They do not need to be online at the same time.
4. Only each player's best eligible attempt counts. The leaderboard updates after every attempt.
5. When the end time passes, the leaderboard freezes and the winner is shown.

**Goals**

- A fast, clean typing test that feels like Monkeytype (minimal UI, smooth caret, instant restart).
- Tournaments that are fair: scores are verified on the server, never trusted from the browser.
- Zero extra infrastructure beyond Vercel plus one managed Postgres database. No websockets, no cron jobs, no separate backend.

**Rules for the LLM that builds this**

- Follow the phases in section 11 in order. Finish a phase's acceptance criteria before starting the next.
- Do not ask questions. Where this plan states a default, use it. Where it is silent, choose the simplest option and note it in the README.
- Use TypeScript in strict mode. Run lint, typecheck and tests at the end of every phase and fix failures before moving on.
- Do **not** copy code, word lists or assets from Monkeytype (it is GPL-3.0 licensed). Write the engine and word list from scratch; this plan describes the behaviour.
- Do not add features listed as out of scope in section 12.

## 2. Tech stack and key decisions

Use one Next.js (App Router) project for UI and API, with serverless Postgres, so everything deploys to Vercel with no extra servers.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (latest stable), App Router, TypeScript strict | One deploy for pages and API route handlers |
| Styling | Tailwind CSS plus CSS variables for themes | Easy theme switching, small bundle |
| Database | Postgres on Neon, added through the Vercel Marketplace | Serverless-friendly, works with Vercel env vars, has branching for previews |
| ORM and migrations | Drizzle ORM, drizzle-kit, `@neondatabase/serverless` driver | Typed SQL, simple migrations, no heavy client |
| Auth | Better Auth with its Drizzle adapter, Google and GitHub OAuth, database-backed sessions | No passwords to store. Auth.js v5 never left beta and is in security-only maintenance, so Better Auth is the better pick for a new project. Keep it behind `lib/auth.ts` so the library can be swapped later |
| Validation | zod | One schema per route, shared types |
| Client data | SWR | Polling for the leaderboard |
| Rate limiting | `@upstash/ratelimit` with Upstash Redis (Marketplace). Optional: fall back to a DB check if not configured | Protects the attempt endpoints |
| Tests | Vitest (unit and API), Playwright (end to end) | Covers the engine, verification and the main flow |
| Hosting | Vercel | As requested |

**Five decisions that shape everything else**

1. **Tournaments are asynchronous, so there is no realtime layer.** Vercel serverless functions cannot hold websockets, and nobody needs live racing. The leaderboard is polled every 10 seconds.
2. **No cron jobs.** A tournament's status (upcoming, active, ended) is derived from `starts_at` and `ends_at` every time it is read. Nothing has to "close" a tournament.
3. **The server is the authority.** The server issues the test text seed, measures time, replays the keystrokes and computes the score. The browser's claimed score is ignored.
4. **One pure typing engine shared by browser and server.** The same `lib/typing` module drives the live UI and the server-side replay, so both always agree.
5. **Every attempt gets its own random seed.** A fixed text per tournament would let players memorise it by retyping.

## 3. Typing test specification

The home page is a standalone typing test that works without an account. The same component, locked to a tournament's settings, is reused on the tournament play page.

**Modes and options**

| Option | Values | Notes |
| --- | --- | --- |
| Mode | `time` or `words` |  |
| Time values | 15, 30, 60, 120 seconds | Timer starts on the first keystroke |
| Words values | 10, 25, 50, 100 | Ends when the last character of the last word is typed |
| Punctuation | on / off | Capitalise after `.` `?` `!`, add commas, periods, quotes, hyphens to some words |
| Numbers | on / off | About 1 word in 10 is replaced by a 1 to 4 digit number |
| Language | `english` only in v1 | Word list `english-1k.json`: about 1,000 common English words written for this project |

**Deterministic text generation** (`lib/typing/words.ts`, `prng.ts`)

- Input: `seed` (32-bit integer), `mode`, `punctuation`, `numbers`. Use a small seeded PRNG such as mulberry32.
- `getWord(config, seed, index)` must return the same word for the same arguments on every machine. Generate words lazily from one PRNG stream so time mode can keep extending the text without changing earlier words.
- The server calls the same function to rebuild the exact text the player saw.

**Typing behaviour** (`lib/typing/engine.ts`, pure functions, no DOM, no Node-only imports)

- The test starts at the first printable keystroke. Time is measured in milliseconds since that keystroke.
- Space commits the current word. It does nothing if the current word is empty.
- Backspace deletes the last typed character. Backspace at the start of a word goes back to the previous word only if that word was committed incorrectly.
- Up to 10 extra characters may be typed past the end of a word. They count as errors.
- A committed word is correct only if it equals the target word exactly.
- Engine API: `initialState(config, seed)`, `applyKey(state, key, tMs) -> state`, `replay(config, seed, events) -> Result`. The UI calls `applyKey` on every key. The server calls `replay` once on submit.
- Event format: `[tMs, key]` where `key` is one character, `" "` for space, or `"\b"` for backspace.

**Metrics** (`lib/typing/scoring.ts`). All rounded to 2 decimals with the same rounding helper on client and server.

- `correctChars` = characters in words committed correctly, plus one per space after a correct word, plus the typed length of the final in-progress word if every character typed so far is correct.
- `wpm` (net, the ranking score) = `(correctChars / 5) / minutes`.
- `rawWpm` = `(all typed characters including spaces / 5) / minutes`.
- `accuracy` = correct keypresses / total character keypresses × 100. Backspace is not counted. A mistake stays counted even after it is corrected.
- `consistency` = `max(0, 100 × (1 − stdev / mean))` of the per-second raw WPM samples. Shown on the result screen only; never used for ranking.
- `minutes` is the fixed duration in time mode, and the time of the last event in words mode.
- Also return `chars: { correct, incorrect, extra, missed }` and `perSecond: number[]` (raw WPM per second, for the chart).

**UI behaviour** (Monkeytype-like)

- Centered layout. A thin config bar above the text. About three lines of text visible, scrolling as you type. A smooth caret. Correct letters, wrong letters and extra letters have distinct colours.
- A hidden `<input>` captures keys. Set `autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"`. Block paste, drop and the context menu. Ignore keys pressed with Ctrl or Meta.
- Timestamps come from `performance.now()`.
- `Tab` restarts the test with a new seed. Show a "click here or press any key to focus" overlay when the input loses focus, and a Caps Lock warning.
- Optional live WPM and timer display, toggled in settings.
- Results screen: WPM, accuracy, raw WPM, consistency, character breakdown, a WPM-per-second line chart (hand-rolled SVG or a small chart library), and buttons for next test and restart.
- Themes: dark (default), light, plus three more, all as CSS variables. Settings (theme, font size, caret style, live WPM) live in `localStorage`.
- v1 is desktop-first. On touch devices show a short "use a physical keyboard" notice.

## 4. Tournament specification

A tournament is a fixed test configuration plus a time window. Players may attempt it any number of times inside the window, and the best eligible attempt is their score.

**Creation form fields**

| Field | Rule | Default |
| --- | --- | --- |
| Title | 3 to 60 characters, required | none |
| Description | Optional, up to 280 characters | empty |
| Mode and value | One of the options in section 3 | time, 60 |
| Punctuation, numbers | On or off | off |
| Language | `english` | english |
| Minimum accuracy | Integer 0 to 100. Attempts below it are saved but do not count. | 90 |
| Start | "Now" or a chosen date and time, at most 30 days ahead | now |
| Duration | Presets 1 hour, 24 hours, 3 days, 7 days, 30 days, or a custom end time. Minimum 10 minutes, maximum 90 days. | 24 hours |
| Max participants | 2 to 200 | 50 |

Store all times in UTC. Show them in the viewer's local time zone using `Intl.DateTimeFormat`. The creator picks times in their own local zone.

**Status is derived, never stored**

| Status | Condition | What players can do |
| --- | --- | --- |
| Upcoming | now < `starts_at` | Join and see the countdown. Cannot play. |
| Active | `starts_at` <= now < `ends_at`, not canceled | Join, play unlimited attempts, watch the leaderboard |
| Ended | now >= `ends_at`, not canceled | Read-only frozen leaderboard and podium |
| Canceled | `canceled_at` is set | Read-only, labelled canceled |

**Rules**

1. Anyone with the link can view the tournament page and leaderboard. Only signed-in users can join or play. Signed-out visitors see a "Sign in to join" button that returns them to the same page.
2. The creator is joined automatically. Everyone else joins with an explicit Join button until `ends_at` or until the participant cap is reached.
3. Every attempt must be started through the API (section 6), which hands out the seed. A user can have only one open attempt per tournament. Starting a new one marks the previous one abandoned.
4. An attempt is **eligible** when it passes verification (section 7) and its accuracy is at least the tournament's minimum.
5. **Ranking:** best eligible net WPM first. Ties go to higher accuracy, then to whoever reached that score earlier. Players with no eligible attempt are listed at the bottom as "no score yet".
6. **Window fairness:** an attempt counts if it was started before `ends_at` and submitted within its own time limit plus a 15 second grace period, even if that is after `ends_at`.
7. Players see their own full attempt history on the tournament page, with the best one marked. Other players only show their best score.
8. The creator can edit the title and description at any time, and can only **extend** `ends_at` while active. Mode, options, accuracy and start time can only change before `starts_at`. The creator can cancel at any time.
9. After the end, show a podium for the top three and a "Run it again" button that opens the creation form prefilled with the same settings. Any participant can use it to create their own tournament.
10. Tournaments are unlisted: they are reachable only through the share link and are marked `noindex`. There is no public tournament directory in v1.
11. The share link is `/t/<code>`. The code is 8 characters from an unambiguous alphabet (no `0 O 1 I l`), generated with `nanoid` `customAlphabet`, unique in the database.
12. Other players see only a username and avatar. Never expose emails.

## 5. Data model

Four domain tables plus the auth tables (user, session, account, verification) that Better Auth's CLI generates for Drizzle. Define them in `src/lib/db/schema.ts` and generate SQL migrations with drizzle-kit. Use `uuid` primary keys (`gen_random_uuid()`) and `timestamptz` for every time.

Better Auth uses text ids for its `user` table by default. Declare every column that references a user (`creator_id`, `user_id`) as the same type as `user.id`.

**users** (Better Auth table, extended)

| Column | Type | Notes |
| --- | --- | --- |
| id | text PK (Better Auth default) |  |
| name, email, image | text | From the OAuth provider. Email is never shown to other users. |
| username | text, unique, lowercase | 3 to 20 characters, `[a-z0-9_]`. Auto-generated on first sign in from the name plus a random suffix. Editable in settings. |
| created\_at | timestamptz |  |

**tournaments**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK |  |
| code | text, unique | 8-character share code |
| creator\_id | uuid FK users |  |
| title, description | text |  |
| mode | text | `time` or `words` (check constraint) |
| mode\_value | int |  |
| language | text | `english` |
| punctuation, numbers | boolean |  |
| min\_accuracy | int | 0 to 100 |
| max\_participants | int |  |
| starts\_at, ends\_at | timestamptz | `ends_at > starts_at` check constraint |
| canceled\_at | timestamptz null |  |
| created\_at | timestamptz |  |

**tournament\_participants** (primary key: tournament\_id + user\_id)

| Column | Type | Notes |
| --- | --- | --- |
| tournament\_id, user\_id | uuid FKs | `on delete cascade` |
| joined\_at | timestamptz |  |
| attempts\_count | int | Count of submitted attempts |
| best\_attempt\_id | uuid null |  |
| best\_wpm | numeric(6,2) null | Best eligible score, denormalised for cheap leaderboards |
| best\_accuracy | numeric(5,2) null |  |
| best\_at | timestamptz null | When the best attempt was submitted |

**tournament\_attempts**

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK |  |
| tournament\_id, user\_id | uuid FKs |  |
| seed | int | Issued by the server |
| status | text | `started`, `submitted`, `abandoned`, `rejected`, `flagged` |
| started\_at | timestamptz | Server time |
| expires\_at | timestamptz | Last moment a submit is accepted |
| submitted\_at | timestamptz null | Server time |
| wpm, raw\_wpm, accuracy, consistency | numeric null | Computed by the server |
| chars\_correct, chars\_incorrect, chars\_extra, chars\_missed | int null |  |
| duration\_ms | int null |  |
| eligible | boolean | True only if verified and accuracy >= minimum |
| reject\_reason | text null | For example `mismatch`, `too_fast`, `bot_like`, `expired` |
| events | jsonb null | The keystroke log, kept for audits and re-verification |

**Indexes**

- `tournament_participants (tournament_id, best_wpm DESC NULLS LAST, best_accuracy DESC, best_at ASC)` for the leaderboard.
- `tournament_participants (user_id)` for "my tournaments".
- `tournament_attempts (tournament_id, user_id, started_at DESC)` for attempt history.
- Partial unique index on `tournament_attempts (tournament_id, user_id) WHERE status = 'started'` so a user can have at most one open attempt.
- `tournaments (creator_id)`.

**Updating the best score.** Inside one transaction on every accepted submission: mark the attempt submitted, increment `attempts_count`, then run a conditional update so a lower score can never overwrite a higher one:

```sql
UPDATE tournament_participants
SET best_attempt_id = $attempt, best_wpm = $wpm, best_accuracy = $acc, best_at = $now
WHERE tournament_id = $t AND user_id = $u
  AND (best_wpm IS NULL OR $wpm > best_wpm
       OR ($wpm = best_wpm AND $acc > best_accuracy));
```

The leaderboard is then a plain `ORDER BY best_wpm DESC NULLS LAST, best_accuracy DESC, best_at ASC` with `ROW_NUMBER()` for the rank.

## 6. API design

Implement these as Next.js route handlers under `src/app/api`. Every handler validates its input with zod, checks the session where required, and returns JSON. Mark private routes `export const dynamic = 'force-dynamic'` and use `export const runtime = 'nodejs'`.

| Method and route | Auth | Purpose |
| --- | --- | --- |
| `GET/POST /api/auth/[...all]` | n/a | Better Auth handler, mounted with toNextJsHandler |
| `PATCH /api/me` | yes | Change username (validate format and uniqueness) |
| `GET /api/me/tournaments` | yes | Tournaments I created or joined, each with derived status and my best score |
| `POST /api/tournaments` | yes | Create a tournament (fields in section 4). Returns `{ code }` |
| `GET /api/tournaments/[code]` | optional | Tournament details, derived status, `serverNow`, and (if signed in) my participation and attempt history |
| `PATCH /api/tournaments/[code]` | creator | Edit title and description, extend `ends_at`, or change locked fields before start |
| `POST /api/tournaments/[code]/cancel` | creator | Set `canceled_at` |
| `POST /api/tournaments/[code]/join` | yes | Join. Idempotent. Fails if ended, canceled or full. |
| `GET /api/tournaments/[code]/leaderboard` | optional | Ranked rows: rank, username, image, best wpm, accuracy, attempts count, best\_at. Allow `Cache-Control: public, s-maxage=5, stale-while-revalidate=10`. |
| `POST /api/tournaments/[code]/attempts` | yes | Start an attempt. Returns the seed. |
| `POST /api/tournaments/[code]/attempts/[id]/submit` | yes | Submit keystrokes. Server verifies and scores. |

**Start an attempt**

Checks: signed in, joined, tournament Active, rate limit passed. In one transaction mark any open attempt `abandoned`, then insert a new one with a random seed, `started_at = now()`, and `expires_at = started_at + 10 minutes + max test duration` (the 10 minutes allow time before the first keystroke).

```ts
// response
{
  attemptId: string,
  seed: number,
  config: { mode: 'time' | 'words', modeValue: number, punctuation: boolean, numbers: boolean, language: 'english' },
  serverNow: string,        // ISO time; client stores the offset to show accurate countdowns
  maxDurationMs: number
}
```

**Submit an attempt**

```ts
// request body (max 256 KB)
{
  events: Array<[number, string]>,   // [msSinceFirstKey, key]; key is one char, ' ' or '\b'
  claimed?: { wpm: number, accuracy: number }  // only used for a sanity comparison
}

// response
{
  attempt: {
    id: string, status: 'submitted' | 'rejected' | 'flagged',
    wpm: number, rawWpm: number, accuracy: number, consistency: number,
    chars: { correct: number, incorrect: number, extra: number, missed: number },
    perSecond: number[],
    eligible: boolean, reason?: string
  },
  isNewBest: boolean,
  rank: number | null,
  totalParticipants: number,
  best: { wpm: number, accuracy: number } | null
}
```

The server pipeline for this route is in section 7. Submitting twice is idempotent: the second call returns the stored result.

**Errors.** Always `{ error: { code: string, message: string } }` with these codes: `unauthorized` (401), `forbidden` (403), `not_found` (404), `validation` (400), `not_joined` (403), `not_active` (409), `full` (409), `rate_limited` (429), `attempt_expired` (410). Never leak stack traces.

**Rate limits** (via Upstash, or a DB fallback): starting attempts at most 1 per 2 seconds and 120 per hour per user; all POST routes limited per IP.

## 7. Fair play and score verification

The goal is to stop casual cheating: edited requests, pasted text, replayed submissions and speed-hacked timers. It cannot stop a custom bot that fakes human-looking timing, and for a friends' tournament that is an acceptable limit. Put all of this in `lib/tournaments/verify.ts` with its constants in one config object.

**Submit pipeline.** Run these steps in order. The first failure stops the pipeline and records the attempt with the stated status and `reject_reason`.

| # | Check | Rule | On failure |
| --- | --- | --- | --- |
| 1 | Ownership and state | Attempt exists, belongs to the caller, status is `started`, tournament not canceled | 404 or 409, nothing stored |
| 2 | Expiry | `now <= expires_at` | `rejected`, reason `expired` |
| 3 | Window | Attempt `started_at` is before the tournament's `ends_at` | `rejected`, reason `outside_window` |
| 4 | Payload shape | At most 5,000 events, times are non-negative integers that never decrease, every key is one printable character, `" "` or `"\b"` | 400 `validation` |
| 5 | No faster than real time (testDurationMs is the fixed duration in time mode, or the last event time in words mode) | `submitted_at - started_at >= testDurationMs - 1000` | `rejected`, reason `too_fast` |
| 6 | Replay | Rebuild the text from `seed` and the tournament config, run `replay(config, seed, events)` from the shared engine, and store the server's numbers. Ignore the client's. | n/a |
| 7 | Claim check | If `claimed` is present, its wpm and accuracy must be within 0.5 of the replay result | `rejected`, reason `mismatch`, and log it (it also catches engine drift) |
| 8 | Plausible speed | Net WPM above `MAX_PLAUSIBLE_WPM` (300) | `flagged`, not eligible |
| 9 | Human timing | With at least 50 keys: more than 20% of gaps under 10 ms, or standard deviation of gaps under 5 ms | `flagged`, reason `bot_like`, not eligible |
| 10 | Eligibility | Accuracy >= tournament `min_accuracy` | Stored as `submitted` with `eligible = false` |
| 11 | Save | In one transaction: store the result, set `eligible`, increment `attempts_count`, run the conditional best-score update from section 5 only if eligible | n/a |

**Other protections**

- The seed comes from the server (`crypto.randomInt`) and is stored with the attempt, so a player cannot pick an easy text and cannot reuse an old attempt.
- One open attempt per user per tournament (partial unique index), which stops parallel attempts being used to cherry-pick text.
- Rate limits from section 6.
- Client-side hardening is courtesy only: block paste and drop, ignore synthetic events (`event.isTrusted === false`), and reject multi-character input.
- Store the `events` log for every submitted attempt so scores can be re-verified later if the verification rules change.
- Keep all thresholds in a single exported constant object so they are easy to tune.

Write unit tests that feed `verify` a perfect human-like log, a log that is too regular, a log with edited timestamps, a log that does not match the seed, and an expired attempt.

## 8. Pages and UI

A shared layout has a slim header (logo, "Test", "Tournaments", sign-in button or user menu) and a small footer. Keep the look minimal and keyboard-friendly, with the theme variables from section 3.

| Route | Auth | Content |
| --- | --- | --- |
| `/` | no | The standalone typing test. Practice results stay in `localStorage`, with a small history of the last 10 results. |
| `/login` | no | "Continue with Google" and "Continue with GitHub". Honour a `callbackURL` so invite links return to the tournament. |
| `/settings` | yes | Username, theme, font size, caret style, live WPM toggle |
| `/tournaments` | yes | Tabs Active, Upcoming, Ended for tournaments I created or joined. Each card shows title, status, countdown, my best score and rank. A "Create tournament" button. |
| `/tournaments/new` | yes | Creation form from section 4 with inline validation. On success, redirect to `/t/<code>` and show a "Copy invite link" button. |
| `/t/[code]` | optional | Tournament page (details below) |
| `/t/[code]/play` | yes | Typing screen locked to the tournament config, with the result panel |
| `not-found`, `error` | n/a | Friendly error pages |

**Tournament page `/t/[code]`**

- Header: title, description, creator, config summary (for example "60s · English · punctuation off · min accuracy 90%"), a status badge, and a countdown to start or end that uses the server time offset.
- A prominent "Copy invite link" button.
- Primary action depends on state: signed out → "Sign in to join"; not joined → "Join"; joined and Active → "Play"; Upcoming → disabled with the start time; Ended or Canceled → no action.
- Leaderboard table: rank, avatar and username, best WPM, accuracy, attempts, time of best. Highlight the current user. Poll every 10 seconds while Active, and stop polling when Ended. Participants with no score are listed last.
- "Your attempts" list (signed in): time, WPM, accuracy, eligible or not (with the reason in plain words), best marked.
- Ended state: podium for the top three and a "Run it again" button.
- Creator-only controls: edit title and description, extend end time, cancel.

**Play page `/t/[code]/play`**

1. On load, call the start-attempt API and render the returned seed with the tournament's locked config (no config bar).
2. `Tab` restarts: abandon the current attempt and request a new one.
3. When the test ends, submit the events and show the verified result from the server (never the client's own numbers), plus "New best!", current rank and "Try again".
4. If the tournament ends mid-test, the attempt still counts under the window rule in section 4, and a banner explains that this was the last attempt.
5. Handle errors with clear messages: not active, expired attempt, rate limited, network failure (offer one retry of the same submit; it is idempotent).

## 9. Project structure

Use this layout so pure logic stays separate from UI and database code. Anything under `lib/typing` must run unchanged in the browser and in a Node serverless function.

```text
.
├─ drizzle/                         # generated SQL migrations (committed)
├─ e2e/                             # Playwright tests
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                   # standalone typing test
│  │  ├─ login/page.tsx
│  │  ├─ settings/page.tsx
│  │  ├─ tournaments/page.tsx       # my tournaments
│  │  ├─ tournaments/new/page.tsx
│  │  ├─ t/[code]/page.tsx          # tournament page
│  │  ├─ t/[code]/play/page.tsx
│  │  └─ api/
│  │     ├─ auth/[...all]/route.ts
│  │     ├─ me/route.ts
│  │     ├─ me/tournaments/route.ts
│  │     └─ tournaments/
│  │        ├─ route.ts                              # POST create
│  │        └─ [code]/
│  │           ├─ route.ts                           # GET, PATCH
│  │           ├─ cancel/route.ts
│  │           ├─ join/route.ts
│  │           ├─ leaderboard/route.ts
│  │           └─ attempts/
│  │              ├─ route.ts                        # POST start
│  │              └─ [id]/submit/route.ts
│  ├─ components/
│  │  ├─ typing/    TypingTest, WordsView, Caret, ConfigBar, ResultsPanel, WpmChart
│  │  ├─ tournament/ TournamentForm, Leaderboard, Countdown, AttemptList, Podium
│  │  └─ ui/        buttons, inputs, badges
│  ├─ lib/
│  │  ├─ typing/                    # PURE: no DOM, no Node-only imports
│  │  │  ├─ engine.ts  scoring.ts  words.ts  prng.ts  types.ts
│  │  │  └─ wordlists/english-1k.json
│  │  ├─ tournaments/
│  │  │  ├─ status.ts  rules.ts  verify.ts  queries.ts  code.ts
│  │  ├─ db/ index.ts  schema.ts
│  │  ├─ auth.ts  env.ts  errors.ts  rate-limit.ts  time.ts
│  └─ tests/                        # Vitest unit and API tests
├─ drizzle.config.ts
├─ .env.example                     # every variable from section 10, no real values
├─ vercel.json                      # optional: function region
└─ README.md                        # setup, scripts, env vars, decisions made
```

`lib/env.ts` parses `process.env` with zod at startup and throws a clear error for anything missing.

## 10. Deploying to Vercel

The whole app runs on Vercel plus a Neon Postgres database added from the Vercel Marketplace. No cron jobs, websockets or other services are needed. The Neon integration adds `DATABASE_URL` and related variables to your Vercel project automatically ([Neon docs](https://neon.com/docs/guides/vercel-managed-integration)).

**Environment variables**

| Variable | Where it comes from | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Added by the Neon integration | Pooled connection. Used by the app at runtime. |
| `DATABASE_URL_UNPOOLED` | Added by the Neon integration | Direct connection. Used by `drizzle-kit migrate`. |
| `BETTER_AUTH_SECRET` | You generate it with `openssl rand -base64 32` | Long random string |
| `BETTER_AUTH_URL` | You | `https://<your-domain>` in production, `http://localhost:3000` locally |
| `NEXT_PUBLIC_APP_URL` | You | Same value as `BETTER_AUTH_URL`. Used to build invite links. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud console | OAuth web client |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub developer settings | OAuth app |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash (Marketplace) | Optional. Without them, use the DB-based rate limit fallback. |

**Rules for the LLM**

- `package.json` scripts: `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`), and `vercel-build` = `npm run db:migrate && next build`. `drizzle.config.ts` reads `DATABASE_URL_UNPOOLED` for migrations. Commit the generated `drizzle/` folder.
- Every API route uses the Node.js runtime. Request bodies stay under 256 KB, far below Vercel's function body limit.
- Check the session inside each route handler and server page. Do not rely on middleware for access control (in Next.js 16 it is called `proxy`, and this app does not need it).
- Set the function region in `vercel.json` (for example `{ "regions": ["sin1"] }`) to match the Neon database region, which should be the one closest to your players.
- Only the leaderboard route may be cached (`s-maxage=5`). Everything else is `no-store`.
- Do not add cron jobs, background workers or websockets. Tournament status is computed on read.
- Provide `.env.example` and a README section for local setup: `vercel link`, `vercel env pull .env.local`, `npm run db:migrate`, `npm run dev`.
- The free Hobby plan is for personal, non-commercial use. Move to Pro if the site becomes commercial ([Vercel limits](https://vercel.com/docs/limits)).

**Steps you do yourself, in order**

*A. Put the code on GitHub*

1. Sign in at github.com.
2. Click **New repository**.
3. Type a name, such as `typing-tournaments`, and click **Create repository**.
4. In your project folder, run `git remote add origin <the repository URL GitHub shows you>`.
5. Run `git push -u origin main`.

*B. Create the Vercel project*

1. Go to vercel.com and click **Sign Up**, then **Continue with GitHub**.
2. Click **Add New…**, then **Project**.
3. Find your repository in the list and click **Import**.
4. Leave every build setting as it is. The framework should say **Next.js**.
5. Click **Deploy**. This first deployment is expected to fail because the database does not exist yet. That is fine.

*C. Add the database*

1. Open your project in Vercel and click the **Storage** tab.
2. Choose **Neon** (Serverless Postgres) from the list. If you do not see it, click **Browse Marketplace** and search for Neon.
3. Choose the free plan.
4. Choose a region near the people who will play, then continue.
5. When asked which project to connect, pick your project. Keep Production, Preview and Development ticked.
6. Open **Settings**, then **Environment Variables**, and check that `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are listed.

*D. Choose your production address*

1. In the project, click **Settings**, then **Domains**.
2. Copy the address that ends in `.vercel.app`. This guide calls it `<your-domain>`.

*E. Create the Google sign-in keys* (button names may differ slightly)

1. Go to console.cloud.google.com and sign in.
2. Create a new project or select an existing one.
3. Open **APIs & Services**, then the OAuth consent screen (also called Google Auth Platform).
4. Fill in the app name and your email, choose **External**, and save.
5. Open **Credentials**, click **Create credentials**, then **OAuth client ID**.
6. Choose **Web application**.
7. Under **Authorized JavaScript origins**, add `https://<your-domain>`.
8. Add a second origin, `http://localhost:3000`.
9. Under **Authorized redirect URIs**, add `https://<your-domain>/api/auth/callback/google`.
10. Add a second redirect URI, `http://localhost:3000/api/auth/callback/google`.
11. Click **Create**, then copy the Client ID and Client secret somewhere safe.

*F. Create the GitHub sign-in keys*

1. On github.com click your profile picture, then **Settings**.
2. Scroll down and click **Developer settings**, then **OAuth Apps**, then **New OAuth App**.
3. Type an application name.
4. Set **Homepage URL** to `https://<your-domain>`.
5. Set **Authorization callback URL** to `https://<your-domain>/api/auth/callback/github`.
6. Click **Register application**.
7. Click **Generate a new client secret**, then copy the Client ID and secret somewhere safe.
8. GitHub allows one callback URL per app, so repeat steps 2 to 7 with `http://localhost:3000` and `http://localhost:3000/api/auth/callback/github` for local development.

*G. Add the variables to Vercel*

1. In your Vercel project, click **Settings**, then **Environment Variables**.
2. Click **Add Environment Variable**.
3. Type `BETTER_AUTH_SECRET` as the name. Paste a value from `openssl rand -base64 32` as the value. Click **Save**.
4. Repeat for `BETTER_AUTH_URL` with `https://<your-domain>`.
5. Repeat for `NEXT_PUBLIC_APP_URL` with `https://<your-domain>`.
6. Repeat for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` with the Google values.
7. Repeat for `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` with the production GitHub values.

*H. Deploy and check*

1. Click the **Deployments** tab.
2. Click the three dots on the newest deployment, then **Redeploy**, then confirm.
3. Wait until the status says **Ready**, then click **Visit**.
4. Sign in with Google, create a tournament, and copy its invite link.
5. Open the link in a private browser window and sign in with GitHub or a second Google account.
6. Join, play one attempt, and check that both accounts appear on the leaderboard.

OAuth sign-in will not work on temporary preview URLs because they do not match the callback addresses above. Test sign-in on `localhost` or on the production address.

## 11. Build phases and acceptance criteria

Build in this order. Each phase must run, pass lint, typecheck and its tests, and be committed before the next one starts.

1. **Phase 0 — Scaffold.** Create the Next.js app with TypeScript strict, Tailwind, ESLint, Vitest and the folder layout from section 9. Add `.env.example`, a README skeleton and the theme CSS variables. *Done when:* `npm run dev`, `npm run build`, `npm run lint` and `npm test` all succeed on an empty app.
2. **Phase 1 — Typing engine (no database).** Implement `prng`, `words`, `engine`, `scoring` and the word list, with unit tests. *Done when:* the same seed gives the same text on repeated runs; hand-written event logs produce the expected WPM, accuracy and character counts; backspace, extra characters, wrong words and final-word handling all have tests; `replay` gives the same result as stepping with `applyKey`.
3. **Phase 2 — Standalone typing UI.** Build `TypingTest`, `WordsView`, `Caret`, `ConfigBar`, `ResultsPanel` and `WpmChart`, themes and settings on `/`. *Done when:* a full 30 second test and a 25 word test can be played with a keyboard, `Tab` restarts, results show all metrics, and pasting is blocked.
4. **Phase 3 — Database and auth.** Add Drizzle schema, migrations, Better Auth with Google and GitHub, username generation, `/login`, `/settings` and the header user menu. *Done when:* a user can sign in and out locally, gets a unique username, can change it, and the migration runs cleanly on an empty database.
5. **Phase 4 — Tournaments without attempts.** Add `status.ts`, `rules.ts`, create, get, patch, cancel and join endpoints, `/tournaments`, `/tournaments/new` and `/t/[code]` with the countdown and an empty leaderboard. *Done when:* a creator can make a tournament and share the link, a second user can open it, sign in and join, and Upcoming, Active, Ended and Canceled each render correctly (test status logic with a fake clock).
6. **Phase 5 — Attempts and verification.** Add the start and submit endpoints, the full pipeline from section 7, the conditional best-score update, rate limiting, and `/t/[code]/play` using the shared engine. *Done when:* a played attempt appears with server-computed numbers; a tampered submission is rejected with the right reason; a lower later score never replaces a higher best; submitting twice returns the same result; verification unit tests from section 7 pass.
7. **Phase 6 — Leaderboard and results.** Add the leaderboard endpoint and component with 10 second polling, "Your attempts", the podium, "Run it again", and the new-best and rank display on the play page. *Done when:* two accounts see each other's best scores and correct ranks (including ties), ended tournaments are frozen, and the creator controls work.
8. **Phase 7 — Hardening and tests.** Add Playwright end-to-end tests for the full flow (create, join with a second account, play, leaderboard, end), accessibility checks on forms, empty and error states, `noindex` metadata on tournament pages, and a README covering setup, scripts, env vars and the decisions taken. *Done when:* the end-to-end suite passes locally and `npm run build` is clean.
9. **Phase 8 — Deploy.** The human follows the steps in section 10. *Done when:* the production site completes the same end-to-end flow by hand with two real accounts.

## 12. Edge cases, testing and out of scope

**Edge cases to handle explicitly**

- **Closed tab mid-test:** the attempt stays `started`, never counts, and is marked `abandoned` when the player starts the next one.
- **Two tabs open:** starting an attempt in one tab abandons the other tab's attempt. Submitting an abandoned attempt returns a clear `not_active` style error.
- **Clock differences:** all rules use server time. The client only uses `serverNow` to display accurate countdowns.
- **Tournament ends while someone is mid-test:** the attempt counts under the window rule in section 4.
- **Ties:** broken by accuracy, then by the earlier `best_at`.
- **Late joiners:** allowed any time before `ends_at`, if the tournament is not full or canceled.
- **Username changes:** the leaderboard always reads the current username.
- **Account deletion:** out of scope for v1, but foreign keys must not make a future delete impossible.
- **Browser quirks:** disable autocorrect and spellcheck on the input, ignore IME composition, show a Caps Lock warning, and handle the input losing focus.

**Testing**

- **Vitest unit tests:** PRNG and word determinism, engine behaviour, scoring formulas, tournament status with a fake clock, ranking and tie-breaks, and every verification check.
- **API tests:** call the route handlers against a test database or a mocked data layer for create, join, start, submit, idempotent submit, rate limiting and permission errors.
- **Playwright:** the full flow with two signed-in users (use a test-only sign-in path that is disabled in production).
- Keep the engine's test fixtures (seed, events, expected result) in one folder, so changes to scoring show up as obvious diffs.

**Out of scope for v1 (do not build)**

- Real-time head-to-head races or any websocket features
- A global leaderboard or public tournament directory
- Quote, zen, custom-text and other Monkeytype modes; languages other than English
- Friends lists, chat, email or push notifications
- Mobile on-screen keyboard support and native apps
- Paid plans, ads or admin dashboards
- Account deletion and data export

After v1, the most useful next steps are email reminders before a tournament ends, a public listing option, and more languages.

**Sources**

- [Neon: Vercel-managed integration](https://neon.com/docs/guides/vercel-managed-integration), for the database variables the integration adds.
- [Vercel: Limits](https://vercel.com/docs/limits), for plan limits.
- [Better Auth: July 2026 security update](https://better-auth.com/blog/security-update-july-2026), showing that Auth.js v5 is still in beta and now maintained by the Better Auth team.
- [Auth.js and Better Auth](https://startwithidentity.com/vendors/open-source/authjs.md), a third-party summary of Auth.js maintenance status; treat it as secondary.

Checked 2026-11-10. Library versions and dashboard labels change, so the implementing LLM should follow each library's current documentation where it differs.
