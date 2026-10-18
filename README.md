# Purple Dino 🦖

Co-op English quiz battle for the classroom. The whole class is a purple dino with a sword and a shield: the teacher projects the battle, students answer on their phones, and if most of the class gets it right the dino strikes.

- Projector (teacher): `http://<host>/`
- Phones (students): scan the QR code or open `http://<host>/join` and type the 4-digit code

Documentation (Spanish): [GAME_DESIGN.md](GAME_DESIGN.md), [docs/requisitos.md](docs/requisitos.md), [docs/modelo-de-acceso.md](docs/modelo-de-acceso.md), [CLAUDE.md](CLAUDE.md).

## Requirements

- Node 22+
- Java 11+ (Firebase emulators)

## Run locally (no Firebase account needed)

```bash
npm install
cp .env.example .env.local
npm run dev:emu
```

Open http://127.0.0.1:5173. The emulators use the offline project `demo-purple-dino`; the emulator UI is at http://127.0.0.1:4000.

### Trying it with real phones on the same Wi-Fi

The emulators only listen on `127.0.0.1` by default. To test with phones, set `"host": "0.0.0.0"` for `auth` and `database` in `firebase.json` (local only, do not commit), then run `npm run dev:emu -- -- --host` and open the projector at `http://<your-LAN-IP>:5173`: the QR code will point phones to that address.

## Tests

```bash
npm run verify        # typecheck + lint + unit tests + security-rules tests + build
npm test              # game logic only
npm run test:rules    # database.rules.json against the emulator
```

## Deploy (done by the project owner)

1. Create a Firebase project, enable **Anonymous** sign-in and **Realtime Database**.
2. Fill `.env.local` with the web app config and `VITE_USE_EMULATORS=false`.
3. `npx firebase use --add` to select the project.
4. `npm run build && npx firebase deploy --only database,hosting`.

## Assets and music

Game art and sounds come from third-party packs, adapted to one style by the scripts in `design/` (`cd design && npm install && npm run assets && npm run music`). Credits and licenses: [design/assets/CREDITS.md](design/assets/CREDITS.md).
