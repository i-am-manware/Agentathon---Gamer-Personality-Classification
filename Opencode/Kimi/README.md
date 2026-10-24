# ✦ HEXAXIS — a cartography of the gamer soul

Twenty-four questions. Six opposing pulls. One star chart that is unmistakably you.

HEXAXIS is a gamer-personality quiz that refuses to hand you a single label.
Every answer tugs one of six archetypes arranged as three rivalries on a 2D
plane, and your result is a **place**, not a box — plotted on an interactive
star chart alongside everyone else who has ever been read.

```
                 Explorer            Architect
                 The Horizon         The Orrery
                       \             /
   Competitor ———— THE STILL CENTER ———— Socializer
   The Arena          (you?)            The Hearth
                       /             \
                 Daredevil           Achiever
                 The Comet           The Vault
```

**Zero dependencies. One command. No build step, no install, no database server.**

```bash
node server.js
```

Then open http://localhost:3000 — that's the whole setup.

---

## Requirements

- **Node.js ≥ 18.17** (developed on Node 24; uses only the standard library)
- Nothing else. No npm packages are installed or needed (`npm start` works too,
  and also installs nothing).

## Run it

```bash
git clone <repo> && cd hexaxis   # or just unzip
node server.js                   # → http://localhost:3000
```

Optional environment variables:

| Variable    | Default            | Purpose                          |
| ----------- | ------------------ | -------------------------------- |
| `PORT`      | `3000`             | HTTP port                        |
| `HOST`      | `0.0.0.0`          | bind address                     |
| `DATA_FILE` | `data/store.json`  | where the JSON store lives       |

Data is created on first run and flushed atomically on change/shutdown.
Delete `data/store.json` to reset the world.

## Verify it works

```bash
node scripts/smoke.js    # 41 end-to-end assertions against a scratch server
node scripts/simulate.js # population simulation behind the tuning constants
node scripts/seed.js     # regenerate the baseline population (already committed)
```

## How the classification works

Six poles, three opposing pairs: **Glory** (Competitor ↔ Socializer),
**Pursuit** (Explorer ↔ Achiever), **Method** (Architect ↔ Daredevil).

- **24 binary trials.** 12 duels inside each opposing pair (measure an axis
  directly), 12 cross-pair duels (keep it unpredictable + cross-validate).
  Every pole is offered exactly 8 times — an equal opportunity surface.
- **Scoring** (server-side; answer keys never reach the browser):
  `s(pole) = wins/8`, `d(axis) = s(A) − s(B)`, and the star's position is the
  vector sum `P = Σ d(axis)·unit(angle)`. Radius = conviction, angle = blend.
- **Titles** blend your two strongest pulls: a Daredevil primary with an
  Achiever undertow becomes *The Relentless Wildfire*. Dominant readers earn
  *The True {noun}*; the rare centered ones earn *The Still Center*.
- **Consistency** cross-validates your cross-pair picks against your
  within-pair leans — it notices when you contradict yourself.
- **Percentiles** compare each pull against 240 seeded souls plus every live
  reader, so even the first user gets "more Explorer than 78% of charted souls".
- Display constants were tuned against 100k simulated readers
  (`scripts/simulate.js`) so the plane spreads beautifully.

## Features

- **The Reading** — 24 rapid-fire duels with keyboard shortcuts (A/B),
  back-navigation, and refresh-safe progress (sessionStorage).
- **Results worth screenshotting** — animated star chart with your point
  dropped in among past readers, hoverable constellation lore, six weighted
  pulls with percentiles, three axis meters, a written three-paragraph reading,
  kindred-game picks.
- **Sharing** — unguessable share links (`/r/:id`) with proper Open Graph
  tags, plus a one-click **PNG portrait** (1600×1000, rendered client-side).
- **Optional accounts** — the full experience works anonymously. Signing in
  (email + password, scrypt) adds: saved history, **retake comparison**
  (two stars on one sky with per-pole deltas and a "your star has wandered"
  drift stat), and cross-device access. A fresh anonymous result can be
  **claimed** into a new account straight from the results page.
- **Anti-cheat** — quiz sessions are shuffled server-side with expiring
  tokens; scoring happens only on the server.
- Hardened defaults: CSP, nosniff, frame-deny, gzip, ETag caching, auth rate
  limiting, constant-time password checks, hashed session tokens, atomic
  store writes, graceful shutdown.

## Architecture

```
server.js            HTTP surface — router, static+gzip, security headers, OG injection
lib/
  quiz.js            the classification engine (sessions, scoring, titles, prose)
  auth.js            scrypt passwords, SHA-256-session tokens, rate limiter
  db.js              atomic JSON document store (swap-in interface for a real DB)
  client-content.js  public archetype metadata (no answer keys)
data/
  questions.js       the 24 trials, pole-tagged & perfectly balanced (8 each)
  content.js         archetypes, lore, hybrid titles, insight copy
  population.json    240 seeded souls (percentile baseline + starfield)
public/
  index.html         SPA shell (landing / quiz / results / dashboard)
  css/main.css       celestial-cartography design system
  js/chart.js        StarChart canvas renderer + PNG portrait exporter
  js/app.js          client state machine
scripts/
  smoke.js           41-assertion end-to-end test (scratch server, no side effects)
  simulate.js        100k-reader population simulation (tuning evidence)
  seed.js            regenerates data/population.json
```

**Why zero dependencies?** Portability and judges' time: clone → `node
server.js` → done, on any Node ≥ 18. The store interface (`lib/db.js`) is a
deliberate seam — reimplement it over SQLite/Postgres if you ever outgrow it
(thousands of readers won't; millions might).

**Paid APIs used:** none. Fonts (Cinzel, Sora, JetBrains Mono — OFL) are
self-hosted in `public/fonts/`, so the app works fully offline.

## License

MIT — chart freely.
