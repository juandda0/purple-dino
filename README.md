# Purple Dino 🦖

Co-op English quiz battle for the classroom. The whole class is a purple dino with a sword and a shield: the teacher projects the battle, students answer on their phones, and if most of the class gets it right the dino strikes.

- Projector (teacher): `http://<host>/`
- Phones (students): scan the QR code or open `http://<host>/join` and type the 4-digit code

Documentation (Spanish): [GAME_DESIGN.md](GAME_DESIGN.md), [docs/requisitos.md](docs/requisitos.md), [docs/modelo-de-acceso.md](docs/modelo-de-acceso.md), [CLAUDE.md](CLAUDE.md).

## Requirements

- Node 22+
- Java 21+ (required by firebase-tools for the emulators)
- Python 3 (only to regenerate the SVG sprites with `design/sprites.py`)

## Run locally (no Firebase account needed)

```bash
npm install
cp .env.example .env.local
npm run dev:emu
```

Open http://127.0.0.1:5173. The emulators use the offline project `demo-purple-dino`; ports: Vite 5173, Auth emulator 9099, Database emulator 9000, Emulator UI http://127.0.0.1:4000.

### Trying it with real phones on the same Wi-Fi

The emulators only listen on `127.0.0.1` by default (and `emulators:exec` ignores extra arguments, so `npm run dev:emu -- -- --host` does not work). Use the LAN variant instead:

```bash
npm run dev:lan
```

It uses `firebase.lan.json` (same database rules, emulators bound to `0.0.0.0`) and starts Vite with `--host`. Open the projector at `http://<your-LAN-IP>:5173`: the QR code will point phones there, and the app uses the page host as the emulator host (or `VITE_EMULATOR_HOST` if set).

## Commands

```bash
npm run dev           # Vite only (5173); with VITE_USE_EMULATORS=true it expects the emulators to be running
npm run dev:emu       # emulators (auth + database) + Vite
npm run dev:lan       # same, reachable from phones on the LAN (see above)
npm run build         # tsc -b + vite build (output in dist/)
npm run preview       # serve the production build locally
npm run typecheck     # tsc -b
npm run lint          # eslint
```

## Tests

```bash
npm run verify        # typecheck + lint + unit tests + security-rules tests + build
npm test              # game logic only
npm run test:rules    # database.rules.json against the emulator
```

`npm run verify` and `npm run test:rules` start their own Database emulator, so they fail with "port taken" if `npm run dev:emu` is already running. In that case run the rules tests against the emulator that is already up: `npx vitest run --config vitest.rules.config.ts`. They use their own database namespace (`demo-purple-dino-rules`), so they never wipe the rooms of the running game.

## Deploy (done by the project owner)

Live: **https://purple-dino-juandda0.web.app** (Firebase project `purple-dino-juandda0`, Spark plan, Realtime Database in `us-central1`).

- `.firebaserc`: `default` is the offline demo project (dev scripts and tests); `prod` is the real one. `npm run deploy` always passes `--project prod`, so a bare `firebase` command in this folder never touches production.
- `.env.production.local` (git-ignored) holds the real web config; the database URL is `https://purple-dino-juandda0-default-rtdb.firebaseio.com`. Do not use the demo values from `.env.example`.
- `npm run deploy`: runs `check:env` (refuses demo/emulator config), `build`, and `firebase deploy --only database,hosting --project prod`.
- Anonymous sign-in is declared in `firebase.json` (`auth.providers.anonymous`). The local firebase-tools 14 cannot deploy that target; it was applied once with the Firebase MCP server's deploy (`only: auth`), which set Auth up as Identity Platform (free tier: up to 3,000 daily active users). Only redeploy it if the providers change.
- Setting up a new project from scratch: create it, add a web app, create the default Realtime Database instance (first time: `firebase init database` or the console), enable Anonymous sign-in, fill `.env.production.local`, add it as the `prod` alias.

Source maps are built as `hidden` and are not deployed (`firebase.json` ignores `**/*.map`).

**Deploy rules and app together, outside class time.** The database rules and the app change in lockstep (e.g. the
one-room-per-teacher index, round keys, the `eligible` field): an old app cannot create rooms against new rules and
vice versa. `npm run deploy` publishes both at once; afterwards, teachers with the game open should reload the page.
Rooms created before the deploy keep working for their host.

## Assets and music

Game art and sounds come from third-party packs, adapted to one style by the scripts in `design/` (`cd design && npm install && npm run assets && npm run music`). `public/assets/` and `dist/` are generated (git-ignored; `npm run assets` fills `public/assets/` from `design/assets/` using an explicit allowlist), while `design/assets/` and `design/sprites/` are committed, so `design/` does not need `npm install` just to run the game. Credits and licenses: [design/assets/CREDITS.md](design/assets/CREDITS.md).
