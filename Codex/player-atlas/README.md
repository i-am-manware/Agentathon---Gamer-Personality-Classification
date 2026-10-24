# Player Atlas

**Same game. Different players.** A complete gamer personality quiz with an interactive hexagonal atlas, six affinity scores, authored insights, downloadable player cards, and optional account history.

Dark field notes, electric chartreuse, orbital geometry, and a personal map worth sharing. No frameworks, no build step, no package downloads, no paid APIs.

## Run in under a minute

Install **Node.js 22.11 or later** ([download](https://nodejs.org/en/download)). From this directory:

```sh
node --experimental-sqlite server.mjs
```

Open **http://127.0.0.1:3000**. That is the complete setup. There is **no install command, no required environment variable, no separate database, and no migration command**. SQLite creates the schema and seeds the sample profile on first startup. An experimental SQLite notice on Node 22 is expected; it does not prevent startup.

If you extracted the source bundle, first run `cd player-atlas`. If you have a working npm installation, `npm start` is equivalent, and `npm run dev` restarts the server when its source changes. Refresh your browser after editing frontend files.

Explore the sample without taking the quiz: **http://127.0.0.1:3000/r/demo**. The sample is clearly labeled and isn't saved to an account. Real guest users receive their full result without signing in.

## What is included

- 24 game dilemmas, four chapters, five nuanced choices per question.
- Mouse, touch, radio-keyboard navigation, and `1`–`5` shortcuts. `Enter` advances after a choice. Previous answers remain editable.
- Quiz progress saved on the current device, including after a refresh.
- Interactive hexagonal profile: explore any archetype, view all six scores, and inspect the evidence behind each trade-off.
- Deterministic solo and hybrid identities, tailored insights, party strengths, a personal side quest, and game suggestions.
- **1200 × 1500 PNG player-card export** drawn directly with Canvas. No screenshot library or remote image service.
- Explicit share links with unguessable tokens. Public cards reveal only the profile; guests can revoke a link. Native sharing falls back to copying the URL.
- Optional email/password accounts, saved results, retakes, full-profile comparison, result deletion, logout, and password-confirmed account deletion.
- Responsive desktop/mobile layouts, native dialogs, focus outlines, reduced-motion support, a custom favicon, and print styling.
- Progressive browser WebMCP support for reading the displayed profile and starting an assessment. Standard browsers work identically without it.

## Optional configuration

The app reads process environment variables. To use the provided example file:

```sh
# macOS / Linux
cp .env.example .env
node --env-file=.env --experimental-sqlite server.mjs
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
node --env-file=.env --experimental-sqlite server.mjs
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address; `0.0.0.0` for a container or LAN |
| `DATABASE_PATH` | `data/atlas.sqlite` next to the server | Durable SQLite file; relative overrides resolve from the working directory |
| `APP_ORIGIN` | Request origin inferred from Host | Exact origin, e.g. `https://atlas.example.com`, for mutation-origin validation |
| `COOKIE_SECURE` | `false` | Set `true` under HTTPS to use Secure `__Host-` cookies |
| `SEED_DEMO` | `true` | Set `false` to skip inserting the sample; it does not remove a previously seeded sample |

No API keys are required. Google Fonts provides optional DM Sans and Space Grotesk typography; system font fallbacks keep the entire app functional offline. No quiz answers or account data are sent to Google. All classification and image generation happen in this app.

### Optional Docker

```sh
docker build -t player-atlas .
docker run --rm -p 3000:3000 -v atlas-data:/app/data player-atlas
```

Use the mounted volume for durable data. When hosting publicly, terminate HTTPS with your reverse proxy, set `APP_ORIGIN` and `COOKIE_SECURE=true`, and ensure the proxy preserves the original Host. One application process with one SQLite file is the intended deployment. The Docker recipe is provided for convenience; the verified setup is the direct Node command.

## Architecture

```text
Browser: semantic HTML + CSS + ES modules
   ├── local device quiz progress
   ├── SVG interactive map / Canvas PNG export
   └── same-origin JSON API
           ├── Node HTTP server + crypto.scrypt
           ├── shared, deterministic classification module
           └── SQLite: users → sessions / results
```

`server.mjs` serves an allowlisted set of static files and owns authentication, validation, classification, and persistence. `shared/model.mjs` is the single source of truth for questions, archetypes, scoring, and comparisons. The server always computes scores from validated answers; client-supplied scores are ignored. `public/app.js` owns presentation and the quiz/account/share journeys; `public/styles.css` owns the theme and responsive layout. There are **zero runtime or development npm dependencies**.

### Database and migrations

- `users`: normalized unique email, display name, salted scrypt hash, creation timestamp.
- `sessions`: SHA-256 token hash, account foreign key, absolute expiration.
- `results`: random ID, nullable account owner, hashed guest visitor ID, answer vector, immutable computed profile, algorithm version, creation timestamp, optional public share token.

Startup applies the idempotent version-1 schema, indexes, foreign keys, WAL mode, and busy timeout. `PRAGMA user_version=1` identifies this schema. No additional migrations are needed. Results are versioned and stored as computed profiles so a future algorithm change need not silently rewrite historical results. Only the clearly labeled sample is refreshed at startup.

Accounts own signed-in runs immediately. A guest result is saved to an account only by pressing **Save my result** and completing sign-in. Guest cookies authorize access to guest results; a result ID alone doesn't. Account and result deletion also disable associated share links. Back up the database with a SQLite backup tool, or stop the app and copy the database file; do not copy a live WAL database file by itself.

### Authentication and privacy

Passwords use asynchronous scrypt (`N=32768`, `r=8`, `p=3`), a random 16-byte salt, and constant-time verification. Unknown login emails still perform the KDF. Sessions use random 192-bit tokens, with only token hashes stored in the database; sessions expire after 30 days and rotate at login. Cookies are HttpOnly and SameSite=Strict. HTTPS configuration adds Secure and `__Host-` names.

Mutation requests require JSON, a custom app header, and same-origin checks; cross-site Fetch Metadata is rejected. Rate limits cover API access, authentication by IP/email, and quiz submissions. At most four password KDFs run concurrently. Prepared statements, bounded request bodies, escaped dynamic content, static-file allowlisting, CSP, frame denial, and no-store API responses protect the application boundary. Proxy IP headers are intentionally not trusted.

This is a self-contained password account system: it does **not** send email, verify mailbox ownership, or provide email password recovery. The interface communicates this. Use a password manager; accounts are optional, and guests get the complete experience. Production operators can add mail verification/recovery separately if required. Rate limiting is in-process, designed for the single-process deployment, and resets on restart.

## Classification: three trade-offs, one atlas

The six archetypes appear clockwise around the hexagon:

| Archetype | Motivation | Angle | Opposite |
| --- | --- | --- | --- |
| Explorer | Discovery | −90° | Strategist |
| Competitor | Mastery | −30° | Socializer |
| Collector | Completion | 30° | Creator |
| Strategist | Planning | 90° | Explorer |
| Socializer | Connection | 150° | Competitor |
| Creator | Invention | 210° | Collector |

Each opposing pair has eight equally weighted questions: four orient the first trait to the left, four reverse it. Choices `0..4` map to `+1,+0.5,0,−0.5,−1`, corrected for orientation. For each pair, average those values to get a signed dimension `d` in `[−1,1]`. Affinities are `50 + 50d` and `50 − 50d`, so every pair adds to 100. These are preferences, **not population percentiles**. Full precision is retained; display values are rounded.

Let `e`, `c`, and `k` denote the Explorer, Competitor, and Collector dimensions. The point is the sum of those three hexagon vectors divided by two:

```text
x = √3 / 4 × (c + k)
y = (−2e − c + k) / 4
```

The point always lies inside the hexagon. SVG uses downward-positive Y; coordinate labels flip Y to the familiar upward-positive convention.

**Three independent dimensions cannot be represented uniquely in two dimensions.** The full profile stays visible beside the map, and identities/insights use the scores rather than the coordinate. `(e,c,k) = (1,−1,1)` lands at the center despite three strong preferences; this is a **Crosscurrent**, not a neutral player. No random jitter, population guesses, AI-generated analysis, or pretend psychological accuracy.

- **Free Agent:** every absolute dimension is at most `0.125`.
- **Crosscurrent:** average absolute dimension above `0.55`, with point radius below `0.2`.
- **Hybrid:** the second trait is at least `60` and within `12.5` points of the first. Twelve authored hybrid titles cover all non-opposing combinations.
- **Solo:** strongest affinity selects an authored title. Exact ties use the documented clockwise ordering.
- **Preference strength:** `100 × mean(abs(d))`; explicitly describes preference strength, never confidence in psychological validity.
- **Evidence:** per-pair left/right/neutral counts and average deviation show whether neutral totals came from balanced choices or changing priorities. The written insights distinguish these cases.
- **History shift:** `50 × sqrt(mean((newDimension − oldDimension)²))`, normalized to `0..100`. This measures all three dimensions, so cancelling map coordinates still register a profile change. It is a change, not an improvement score.

## Verification

```sh
node --experimental-sqlite --test tests/model.test.mjs tests/api.test.mjs
```

17 tests use the built-in Node test runner and temporary databases. They cover question orientation, neutral/mixed/extreme profiles, inversion symmetry, secondary-signal thresholds, all **35,937 attainable dimension triples** for hex containment, deterministic scoring, malformed inputs, guest ownership, explicit sharing/revocation, account claiming/login/logout/expiration, password hashing, deletion cascades, cross-site rejection, static traversal rejection, and durable history across a server restart.

The browser walkthrough also checks a complete 24-question guest run, keyboard choices, refresh recovery, optional account saving, the results screen, and responsive layouts. PNG export uses the browser’s standard download path.

### API reference

All mutation requests use `Content-Type: application/json` and `X-Atlas-Request: 1`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Readiness/version |
| GET | `/api/me` | Current account or `null` |
| POST | `/api/auth/register` | `{name,email,password}` |
| POST | `/api/auth/login` | `{email,password}` |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/results` | `{answers:[24 integers from 0 to 4]}` |
| GET | `/api/results/:id` | Read own guest/account result |
| POST | `/api/results/:id/claim` | Explicitly save own guest result to account |
| POST | `/api/results/:id/share` | Create/reuse public share token |
| DELETE | `/api/results/:id/share` | Disable public share token |
| GET | `/api/share/:token` | Read sanitized public profile |
| GET | `/api/history` | Signed-in history, newest first, latest 100 profiles |
| DELETE | `/api/results/:id` | Delete owned result and share |
| DELETE | `/api/account` | `{password}`; delete account and associated data |

### Useful implementation references

[Node SQLite](https://nodejs.org/download/release/v22.11.0/docs/api/sqlite.html) · [Node crypto](https://nodejs.org/download/release/v22.11.0/docs/api/crypto.html) · [SQLite pragmas](https://www.sqlite.org/pragma.html) · [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

MIT licensed. Play curious.
