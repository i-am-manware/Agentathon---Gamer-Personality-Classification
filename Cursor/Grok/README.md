# Rift Index

A playstyle cartography. Twenty-four situations, six signals, one coordinate on a field.

You answer as a player, not a patient. The result is a point on the playfield, a breakdown across three opposing pairs, a written reading, and a chart you can share.

## Run

Requires **Node.js 24 or newer** (`node -v`). No database server, no API keys, no build step, and no packages to install.

```bash
npm test
npm start
```

Open [http://localhost:4321](http://localhost:4321).

`npm install` is unnecessary. The app has zero dependencies and uses Node's built-in SQLite. `npm start` and `npm test` are only scripts.

If port 4321 is taken:

```bash
# Windows PowerShell
$env:PORT = "4400"; npm start

# macOS / Linux
PORT=4400 npm start
```

| Optional variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4321` | HTTP port |

To start over, stop the server and delete `data/rift.sqlite` plus `data/rift.sqlite-wal` and `data/rift.sqlite-shm` if they exist. The next start reseeds the demo file.

## Try it

- **Take the quiz.** Signing in is optional. "Continue without an account" still issues the full chart: coordinate, bars, essay, link, and image.
- **Sample chart:** [http://localhost:4321/r/sample](http://localhost:4321/r/sample)
- **Night desk file** (history, drift map, retake comparison): `ada@riftindex.demo` / `night-desk`
- **Atlas** explains the six signals. **Method** lets you move the six affinities and watch the jewel update from the real scorer.
- On a result: copy a share line, download PNG, or download SVG.

Guest charts taken in the same browser are claimed into a file the moment you sign in or register.

## What a file adds

Everyone gets the full reading. A signed-in file keeps every chart, draws them as a trail on one playfield, and writes a drift line against the previous reading ("Since The Detour, Architect climbed…").

## How a reading is placed

The long version is on `/method` and in `server/scoring.js`.

1. Each answer adds weight to one pole of one axis. All six signals have the same maximum, so the instrument is not biased toward a costume.
2. Affinity is weight earned divided by weight available, from 0 to 1.
3. Opposing poles become a signed lean: Architect minus Wildcard, Laureate minus Nomad, Chorus minus Shade. A tie contributes no direction. Both bars can still be high. That is a braid, and it pulls the jewel inward.
4. The winning side of each lean becomes mass on the rim. The jewel is their center of mass, with a radius curve so one loud signal reaches the edge and a split signal stays visible inside the field.
5. Clarity is the correlation between the odd questions and the even questions: Sharp, Braided, or Mixed.

The title follows those masses. Bright names and leader lines are the reading. On a flat map, a blend of two non-adjacent signals can sit inward of a third label. That third label is geometry, not the verdict.

The six signals, as three opposing pairs:

| Axis | Pair | The argument |
| --- | --- | --- |
| Composition | Architect ↔ Wildcard | Planned and improvised |
| Destination | Laureate ↔ Nomad | Victory and wandering |
| Company | Chorus ↔ Shade | Shared and solitary |

## Layout

```
server/     HTTP API, SQLite schema, scoring, copy, SVG card
public/     interface (no build)
data/       rift.sqlite, created on first start
```

Accounts are email and password, hashed with scrypt. Sessions are random tokens in an HttpOnly cookie; only the hash is stored. Guest charts are public at `/r/:slug`. Raw answers stay visible to the owner (the signed-in file, or the browser that holds the claim token).

## Tests

`npm test` checks that the question bank is balanced, that pure signals, neighbor blends, 120° blends, paradoxes, and cancellations land where the model says they should, and that auth, guest claim, history, and the SVG card work end to end.
