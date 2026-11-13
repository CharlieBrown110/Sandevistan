# Sandevistan // Edgerunners Typing Tournament Engine

A high-performance Monkeytype-inspired asynchronous competitive typing tournament platform built with Next.js App Router, Tailwind CSS, and TypeScript in strict mode.

Infused with a futuristic **Cyberpunk Edgerunners** aesthetic:
- **Sandevistan Dark Mode**: Night City carbon black, signature neon jacket yellow (`#FCEE09`), optic cyan (`#00F0FF`), cyber magenta (`#FF0055`), scanline overlays and glowing HUD telemetry.
- **Arasaka Lab Light Mode**: High-contrast, clean laboratory cyber aesthetic with slate paneling and crimson accents.

---

## 1. Key Architectural Decisions

1. **Pure Typing Engine Shared by Browser and Server (`src/lib/typing/`)**:
   - `engine.ts`, `prng.ts`, `words.ts`, and `scoring.ts` have zero DOM or Node-only imports.
   - The same engine powers the interactive client UI and server-side replay.
2. **Zero-Trust Score Verification (`src/lib/tournaments/verify.ts`)**:
   - The client's claimed score is ignored.
   - Keystroke events `[tMs, key]` are submitted to the server, which re-seeds the deterministic Mulberry32 PRNG, replays the exact test, checks wall-clock time, flags bot-like gap consistency, and computes the authoritative score.
3. **Pure Asynchronous Tournaments (No WebSockets / No Cron Jobs)**:
   - Eliminates persistent socket connections.
   - Status (`upcoming`, `active`, `ended`, `canceled`) is derived purely on read from `starts_at` and `ends_at`.
   - Leaderboard is polled every 10 seconds during active tournaments and freezes when ended.
4. **Conditional Best Score Transactions**:
   - Scores never regress. Lower subsequent attempts never overwrite a player's personal best.

---

## 2. Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript strict mode)
- **Styling**: Tailwind CSS with CSS variables for dynamic Dark/Light theme switching
- **Database**: Serverless PostgreSQL (Neon) with Drizzle ORM and `drizzle-kit`
- **Validation**: Zod
- **Client Polling**: SWR (10s intervals for live active leaderboards)
- **Rate Limiting**: Sliding-window rate limiter with Upstash Redis compatibility and in-memory fallback
- **Testing**: Vitest unit and verification test suite

---

## 3. Project Structure

```text
.
├── drizzle/                         # Committed SQL migrations
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with ThemeProvider, scanline effects
│   │   ├── globals.css              # Cyberpunk CSS variables & scanline gradients
│   │   ├── page.tsx                 # Standalone typing test with local practice history
│   │   ├── login/page.tsx           # Authentication (OAuth & Fast Sandbox login)
│   │   ├── settings/page.tsx        # Profile, username, theme, font size, caret style
│   │   ├── tournaments/page.tsx     # User tournaments (Active, Upcoming, Ended)
│   │   ├── tournaments/new/page.tsx # Creation wizard
│   │   ├── t/[code]/page.tsx        # Tournament hub, countdown, leaderboard, podium
│   │   ├── t/[code]/play/page.tsx   # Locked tournament play screen & server replay
│   │   ├── not-found.tsx            # Cyberpunk 404 page
│   │   ├── error.tsx                # Error boundary
│   │   └── api/
│   │       ├── auth/[...all]/       # Better Auth / session handlers
│   │       ├── me/                  # Profile & username updater
│   │       ├── me/tournaments/      # User tournament list
│   │       └── tournaments/         # Create, get, patch, cancel, join, attempts, submit
│   ├── components/
│   │   ├── theme/                   # ThemeProvider with localStorage persistence
│   │   ├── typing/                  # TypingTest, WordsView, Caret, ConfigBar, ResultsPanel, WpmChart
│   │   ├── tournament/              # TournamentForm, Leaderboard, Countdown, AttemptList, Podium
│   │   └── ui/                      # CyberButton, CyberBadge, CyberCard, Navbar, Footer
│   ├── lib/
│   │   ├── typing/                  # PURE: engine, scoring, words, prng, types
│   │   ├── tournaments/             # verify, status, rules, store, code
│   │   ├── db/                      # schema, index
│   │   ├── auth.ts                  # session management & username generator
│   │   ├── env.ts                   # validated environment variables
│   │   ├── errors.ts                # typed API errors
│   │   ├── rate-limit.ts            # sliding-window rate limiting
│   │   └── time.ts                  # local formatting & durations
│   └── tests/                       # Vitest unit tests (engine, scoring, status, verify)
├── drizzle.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## 4. Local Development Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run tests
```bash
npm test
```

---

## 5. Deployment to Vercel & Neon Postgres

1. Push your repository to GitHub.
2. In Vercel, click **Add New Project** and import the repository.
3. In the Vercel **Storage** tab, add **Neon** (Serverless Postgres free plan).
4. Vercel automatically populates `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
5. Add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and OAuth client credentials in Vercel **Settings > Environment Variables**.
6. Redeploy. Vercel executes migrations and deploys your serverless edge application.

---

## 6. License
MIT
