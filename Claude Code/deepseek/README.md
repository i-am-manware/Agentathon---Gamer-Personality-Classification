# SPAWNPOINT

**A gamer personality classifier that plots you on a two-dimensional Playstyle Plane.**

24 questions. Six archetypes. One coordinate.

You answer a quiz, and instead of being handed a single label you get placed at a
point on a plane — direction encodes *which* archetype you lean toward, distance
from the centre encodes *how hard* you lean. Then you get a written reading, a
breakdown across all six axes, and a shareable card.

---

## Quick start

```bash
git clone <this repo> spawnpoint
cd spawnpoint
npm start
```

Then open **http://127.0.0.1:4321**.

That is the whole setup. There is no install step, because there are no
dependencies — `package.json` has an empty `dependencies` object and the app
runs on Node's standard library alone.

**Requirements:** Node **20.11+**. On Node **22.5+** you get the SQLite driver
automatically; on older runtimes the app transparently falls back to a
JSON-file driver. Both are built in; neither needs installing.

On first boot the server creates `data/`, generates a session secret, and seeds
900 synthetic playthroughs so the population plane is not empty. Expect the
first start to take about a second.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Run the server on `http://127.0.0.1:4321` |
| `npm run dev` | Same, with `--watch` for auto-restart on file changes |
| `npm test` | Run the scoring test suite (19 tests, no network needed) |
| `npm run seed` | Re-seed the synthetic population if it is missing |
| `npm run reset` | Wipe all attempts and re-seed from scratch |

---

## Configuration

Everything is optional. Copy `.env.example` to `.env` if you want to change
anything; the app reads `.env` at boot with no dependency.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4321` | |
| `HOST` | `127.0.0.1` | Set to `0.0.0.0` to expose on your network |
| `SESSION_SECRET` | generated | Auto-generated and persisted to `data/session-secret` if unset |
| `DATA_DIR` | `./data` | Where the database and secret live |
| `SEED_POPULATION` | `true` | Set to `false` to boot with an empty plane |
| `SEED_SIZE` | `900` | How many synthetic playthroughs to generate |

---

## How it works

### The plane

Each archetype owns a fixed unit vector on the plane, 60° apart:

```
                      ARCHITECT (60°)
                            ●
        STORYTELLER (120°) ●   ● CONNECTOR (300°)

  WANDERER (180°) ●         +         ● COMPETITOR (0°)

                      CURATOR (240°)
                            ●
```

Three opposing pairs sit exactly 180° apart:

- **Conquest ↔ Discovery** — Competitor ↔ Wanderer
- **Build ↔ Collect** — Architect ↔ Curator
- **Immerse ↔ Belong** — Storyteller ↔ Connector

Your answers produce a weight vector over the six, normalised to a distribution
`w`. Your coordinate is the **weighted barycentre** of the six vertices:

```
P = Σ wᵢ · Vᵢ
```

A hexagon is not decoration here — it is the load-bearing choice. It is the only
regular polygon whose six vertices sum to the origin while still forming three
clean opposing pairs. That is what makes "no strong preference" land exactly on
(0, 0) rather than drifting to one side.

### Four refinements on top of that

1. **Debiasing.** No question bank is perfectly even. If Competitor options are
   worded more often than Curator options, a random responder still drifts
   toward Competitor — which is a lie. So the model derives `E`, the weight
   vector a uniformly random playthrough would score against *this exact bank*,
   and works with the deviation `d = w − E`. `E` is computed at runtime and
   memoised, so the questions can be rewritten later without silently shifting
   everyone's coordinate.

2. **Whitening.** Some archetypes are easier to trigger than others, which would
   give them a longer lever over the coordinate. The model measures how far a
   maximally-consistent playthrough for each archetype can push the point and
   rescales the axes so all six reach the same distance. It folds in the spread
   of each archetype under random play too, so a noisier archetype does not
   outrank a stable one on sampling luck.

3. **Taring the radius.** Raw deviation is a narrow band — about 0.15 for a
   coin-flip responder, about 0.6 for a zealot. Plotted raw, everybody lands in
   a small ring near the middle. So the scale is tared the way you would zero a
   set of scales:

   ```
   r = ((|d| − FLOOR) / (CEILING − FLOOR)) ^ 0.62
   ```

   `FLOOR` is the mean `|d|` of a simulated coin-flip responder — the
   instrument's own noise floor. `CEILING` is the mean `|d|` of the six
   maximally-consistent playthroughs. **Both are computed from the bank at
   startup, not hand-tuned magic numbers.** Change the questions and the scale
   re-tares itself.

4. **Shared code path.** The scoring module is served verbatim to the browser
   *and* imported by the server. The live preview you watch while answering is
   the identical code that produces your final result — not an approximation of
   it. The server re-scores every submission and rejects any attempt whose
   coordinate disagrees with its own by more than 0.02, so a tampered client
   cannot write a fabricated point into the population data.

Full write-up with the honest limitations is on the `/about` page in the app.

---

## Architecture

```
shared/          ES modules imported by BOTH the browser and the server
  archetypes.js    six archetypes, angles, opposing pairs, plane sectors
  questions.js     the 24-question bank
  scoring.js       the classification algorithm (single source of truth)
  insight.js       the deterministic prose generator

src/             the server — Node standard library only
  server.js        HTTP server, security headers, routing, graceful shutdown
  http.js          hand-written router, static file server (ETag/gzip/MIME)
  routes.js        the JSON API
  db.js            SQLite driver + JSON fallback behind one interface
  auth.js          scrypt password hashing, sessions, rate limiting
  config.js        .env loader and runtime config

public/          the client — no framework, no build step
  index.html       the shell
  css/             app.css (tokens + chrome), quiz.css, results.css
  js/              dom, api, store, sfx, toasts, modal, plane, quiz,
                   results, share, auth, app (router + boot)
  favicon.svg      the mark
  app.webmanifest  installable

scripts/
  seed.js          synthetic population generator
  calibrate.js     calibration harness for the scoring model

test/
  scoring.test.js  19 tests covering the algorithm
```

### Why zero dependencies

The whole app — server, database layer, authentication, router, static file
server, canvas renderer, share-card exporter, sound engine — is hand-written
against Node's standard library and the browser's native APIs.

The practical payoff: `git clone && npm start` is the entire setup, there is no
lockfile to audit, no supply chain to trust, and nothing to break when a
transitive dependency publishes a bad minor. The app boots in under a second and
serves the full experience from a single process.

### Storage

Two drivers behind one interface, chosen automatically at boot:

- **`sqlite`** (default) — Node's built-in `node:sqlite`. Real SQL, real
  indexes, no npm package, no native build step.
- **`json`** — the same tables held in memory and flushed atomically
  (write-to-temp then rename) for runtimes without `node:sqlite`.

The app never talks to a driver directly; it talks to `src/db.js`. That is what
makes the fallback a genuine guarantee rather than a promise in a README.

### Authentication

Optional, always. You can take the quiz and see full results without an account
— the results screen is identical either way.

- Passwords hashed with **scrypt** (N=16384, r=8, p=1, 64-byte key, 16-byte
  per-user salt), compared in constant time.
- Sessions are opaque 32-byte random tokens; only an HMAC-SHA256 hash is stored
  server-side. `httpOnly`, `SameSite=Lax`, 30-day expiry.
- Rate limiting on registration, login, and attempt creation.

Signing in buys you **history**: every run is stored against your account, and
the history page compares your two most recent runs archetype by archetype so
you can watch your coordinate drift. Anonymous runs taken before you sign in are
adopted into your account on login.

---

## API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/quiz` | The question bank |
| `POST` | `/api/score` | Score an answer array without persisting |
| `POST` | `/api/attempts` | Persist a run (server re-scores; rejects mismatches) |
| `GET` | `/api/attempts/:id` | Fetch a stored run |
| `DELETE` | `/api/attempts/:id` | Delete one of your runs |
| `GET` | `/api/population` | Sampled points + archetype counts |
| `POST` | `/api/auth/register` | |
| `POST` | `/api/auth/login` | |
| `POST` | `/api/auth/logout` | |
| `GET` | `/api/me` | Current user + their attempts |
| `GET` | `/api/health` | Driver, version, counts |

```bash
# Score a playthrough without saving it
curl -s localhost:4321/api/score \
  -H 'content-type: application/json' \
  -d '{"answers":[0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3]}'
```

---

## Sharing

Three ways, all client-side:

- **PNG card** — a 1200×630 share card drawn entirely on a canvas. No
  html2canvas, no image assets, no server round-trip. It re-uses the same plane
  geometry as the live renderer, so the card is always a faithful picture of the
  result.
- **Share link** — carries your answers as a compact code, not your identity.
  Anyone opening it sees the same result, recomputed from scratch on their
  machine.
- **Native share** — the Web Share API with the PNG attached, when the platform
  allows it.

---

## Accessibility & polish

- Full keyboard control of the quiz: `1`–`4` to answer, `←`/`→` to navigate,
  `Enter` to jump to the next unanswered question.
- Focus is trapped in modals and restored to the opener on close; Escape
  dismisses.
- `prefers-reduced-motion` is respected throughout — the CRT flicker, the plane
  reveal, and every bar animation stand down.
- Screen-reader labels on the canvas, the progress rail, and every icon button.
- A skip link, a visible focus ring, and a `noscript` fallback that points at the
  API.
- Responsive from 320px up. The plane, the breakdown bars, and the share panel
  all reflow rather than shrink.

---

## Notes

- The synthetic population is clearly labelled in the UI — seeds are drawn
  dimmer than real points, and hovering a point tells you which it is. Nothing
  pretends simulated data is real.
- This is a designed classifier, not a validated psychometric instrument. It has
  no claim to scientific validity and does not want one. The archetypes were
  chosen to be recognisable and fun to argue about, not to be exhaustive.

## License

MIT
