# PIXEL PSYCHE

**A retro-arcade gamer personality scanner.** Twenty-five playful questions, six archetypes arranged as three opposing drives at 60°, and one genuinely impressive results page that charts you as a **coordinate on a live 2D plane** — not a label. Shareable card, share link, optional accounts with a saved archive and retake drift comparison.

Zero dependencies. Zero external APIs. Clone → run → play in under five minutes.

---

## Quickstart

**Requirements:** [Node.js](https://nodejs.org) **18 or newer**. Nothing else. There is no `npm install` step — the project intentionally uses only the Node standard library.

```bash
git clone <this-repo>
cd pixel-psyche
npm start
```

Open **http://localhost:3000**. That's it.

On first boot the server automatically:

- creates `data/psyche.json` (the database),
- seeds an anonymous **ghost field** of ~850 synthetic scans so the plane looks alive,
- creates a demo archive account so you can try signed-in features instantly.

> **Demo account:** handle `PLAYER1`, password `arcade123` — it ships with 3 historical scans so history + retake comparison are immediately demoable.

```bash
npm test        # 33 tests: scoring, share codes, storage, auth, HTTP API, spawned-server E2E
node scripts/simulate.js   # prints how synthetic pure/dual personas get charted (calibration tool)
```

Tested on Node 18/20/22/24, Windows / macOS / Linux. Startup takes about a second.

---

## What you get

| Surface | Details |
| --- | --- |
| **Landing** | CRT-arcade cabinet theme, live animated ghost field, archetype roster, three-step explainer |
| **Quiz** | 25 weighted questions, auto-advance, keyboard play (`1–6`, backspace), segmented progress bar, resume-after-refresh, retro SFX (toggleable) |
| **Results** | Animated plane coordinate + ghost-field isolation, hex radar, six score bars, three tension sliders, signal clarity ring, written readout (strengths / signature move / party role / kryptonite / genre list), drift-vs-last-scan panel |
| **Sharing** | 1080×1350 PNG share card rendered on canvas, copy-image to clipboard, native share sheet, and a checksummed share link that reproduces the exact same scan anywhere |
| **Archive** (signed in) | Every scan saved, reopenable full reports, two-scan side-by-side comparison with per-archetype drift bars, delete |
| **Method** | Full transparent explanation of the math, worked example, privacy notes, FAQ |

---

## The classification model

Six archetypes, paired as three opposing drives:

| Pair | Drives | Meaning |
| --- | --- | --- |
| **DUELIST ⇄ ARCHITECT** | compete / create | prove it vs. make it |
| **CURATOR ⇄ PATHFINDER** | complete / discover | finish it vs. explore it |
| **TACTICIAN ⇄ BARD** | solve / gather | master the system vs. master the lobby |

The plane is a 60°-spaced vector basis: each pair is one axis through the origin.

1. **Answer scoring.** Each option awards weighted points to one or more archetypes (some answers split their weight — real players do too).
2. **Per-archetype normalization.** Each archetype's raw score is divided by the maximum it *could* have earned across the quiz, so no archetype is easier to max out than another.
3. **Tension extraction.** `t₁ = DUELIST − ARCHITECT`, `t₂ = CURATOR − PATHFINDER`, `t₃ = TACTICIAN − BARD` (each −100…+100).
4. **Projection.** `v = ½ · (t₁û₁ + t₂û₂ + t₃û₃)` with unit vectors 60° apart; magnitude is compressed with `r = 0.97 · tanh(3.1·|v|)` so specialists sit near their vertex and generalists near the center without hitting the rim.
5. **Signal clarity.** Entropy of the six scores blended with the pull magnitude: `confidence = 0.55·clarity + 0.45·pull`.
6. **Naming.** Dominant + secondary archetypes produce a build title (30 authored pair titles + 6 solo titles), a tier (fluid/hybrid/specialist/pure), and a generated readout assembled from archetype copy, the strongest tension, and your weakest axis.

Scoring runs **server-side**: the client never receives option weights, so results cannot be tampered with, and share codes are recomputed from raw answers on the server.

---

## Architecture

```
server.js                 entry point: boot, logging, graceful shutdown
src/
  app.js                  app factory (used by server + tests)
  config.js               env-driven configuration
  http/
    router.js             tiny method+pattern router
    static.js             static files, ETag/304, gzip cache, traversal-safe
    helpers.js            JSON body limits, error types, response helpers
  lib/
    store.js              embedded JSON document store (atomic writes)
    seed.js               deterministic ghost-field + demo-archive seeding
    auth.js               scrypt password hashing, cookies, tokens
    session.js            session → user resolution
    scoring.js            normalization, projection, confidence, tiers
    insights.js           titles + personalized readout copy
    share.js              answer ⇄ share-code encoding (FNV-checksummed)
    ratelimit.js          per-IP sliding window limiter
  routes/                 auth, quiz/result, archive, field/stats
shared/quiz.data.js       archetypes, pairs, 25 questions (imported by server only)
public/                   zero-build SPA: HTML + CSS + ES modules
  js/components/plane.js  the animated player-DNA plane (SVG)
  js/sharecard.js         canvas share-card renderer
  ...
test/                     node:test suites incl. spawned-server E2E
```

**Zero runtime dependencies.** The database is an embedded JSON document store in `src/lib/store.js`: debounced atomic writes (temp file + rename), in-memory indexes, schema migration-safe defaults, corrupt-file backup and recovery. At this scale it's faster, smaller and more portable than any SQL engine — and you never need a build toolchain. The store exposes a repository-shaped API; swapping in SQLite later would touch one file.

**Browser support:** any modern evergreen browser. No bundler, no framework, no npm packages. Google Fonts is the only external request, and the UI falls back to system monospace if it's blocked.

---

## Configuration

All optional — the defaults just work.

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port (auto-increments if busy) |
| `HOST` | `0.0.0.0` | Bind address |
| `DATA_DIR` | `./data` | Where `psyche.json` lives |
| `COOKIE_SECURE` | `0` | Set to `1` when serving over HTTPS (adds `Secure` cookies) |
| `TRUST_PROXY` | `0` | Set to `1` behind a reverse proxy (uses `X-Forwarded-For`) |

---

## API reference

| Method + path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/quiz` | — | Questions + archetypes (weights stripped) |
| `POST /api/result` | — | `{answers[]}` or `{code}`, optional `record:true` → score, insight, share code |
| `GET /api/field` | — | Anonymous ghost-field points for the plane |
| `GET /api/stats` | — | Scan totals + archetype distribution |
| `POST /api/auth/register` | — | `{username, password}` → session cookie |
| `POST /api/auth/login` / `logout` / `GET me` | — | Session management |
| `GET /api/attempts` | ✓ | Archived scans (summaries + answers) |
| `POST /api/attempts` | ✓ | Explicitly archive an answer set |
| `DELETE /api/attempts/:id` | ✓ | Remove one scan |
| `GET /api/healthz` | — | Uptime probe |

**Storage schema** (`data/psyche.json`): `users[]` (scrypt `passHash` + per-user salt), `sessions[]` (opaque 256-bit tokens with expiry), `attempts[]` (user-scoped, capped at 200/user), `field[]` (anonymous `{x, y, a}` points, capped at 5000), `counters`, `meta`.

**Share link format:** `/#/r/<code>` where the code is `version + 25 base-36 answer digits + 2-char FNV checksum`. The server validates length, checksum, version and answer ranges before recomputing the identical coordinate.

---

## Privacy

- Field points are anonymous coordinates only — no IPs, no answers, no identifiers.
- Accounts are entirely optional; the full quiz and results work without one.
- No analytics, no third-party services, no external APIs. Everything runs on the machine you start.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `EADDRINUSE` | The server auto-tries the next port; check the banner for the actual URL, or set `PORT` |
| Port 3000 blocked by firewall | `set PORT=8080` (Windows) / `PORT=8080 npm start` |
| Want a fresh start | Stop the server and delete `data/psyche.json` — it reseeds on boot |
| Fonts look different offline | Expected: Google Fonts is optional, system monospace is the fallback |

---

Built as a single-pass challenge entry — enjoy the cabinet. `< 3`
