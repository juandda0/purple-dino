# Mapa — Purple Dino (commit 0c3bef0)

## Stack
React 19.3 + react-router 7.18 + Zustand 5, Vite 7.3, TypeScript 5.9 (strict), Firebase JS SDK 12.19 (Auth anónima + Realtime Database), Firebase Hosting. Tests: Vitest 3.2 (lógica) + @firebase/rules-unit-testing 5 (reglas, emulador). ESLint 9 + typescript-eslint. Node 22, Java 21 (emuladores). Sin backend propio ni Cloud Functions.

## Verificación
`npm run typecheck` · `npm run lint` · `npm test` · `npm run test:rules` (levanta emulador; si ya corre `dev:emu`, usar `npx vitest run --config vitest.rules.config.ts`) · `npm run build` · todo: `npm run verify`.

## Carpetas
- `src/game/` lógica pura: `rules.ts` (dificultad, escudo, mayoría, rondas, barajar), `questions.ts` (banco + mazo sin repetición), `stops.ts`, `types.ts` (modelo de datos). Tests `*.test.ts`.
- `src/data/` acceso a RTDB: `room.ts` (crear/borrar sala, unirse, presencia, respuestas), `hooks.ts`.
- `src/lib/firebase.ts` init única, emuladores, auth anónima, reloj del servidor.
- `src/host/` proyector: `controller.ts` (bucle de la partida, respuesta correcta solo en memoria), `RoomScreen.tsx`, `HostApp.tsx`, `store.ts`, `screens/{Menus,Lobby,Battle,End}.tsx`.
- `src/play/PlayApp.tsx` celular (unirse, listo, responder, resultado, final).
- `src/ui/` Stage, Sprite, Hud, answers. `src/audio/` music.ts, sfx.ts. `src/styles/game.css`.
- `src/content/questions/course-6/unit-01..12.json` (240 preguntas).
- `database.rules.json`, `tests/rules/database.rules.test.ts`, `firebase.json`, `.firebaserc` (demo-purple-dino), `.env.example`.
- `scripts/sync-assets.mjs` (design/assets → public/assets). `design/` mockups, generadores de assets (`tools/build-assets.js`, `tools/build-music.js`, `sprites.py`), packs de terceros en `assets-src/`.
- Docs: `README.md`, `CLAUDE.md`, `GAME_DESIGN.md`, `docs/requisitos.md`, `docs/modelo-de-acceso.md`, `design/assets/CREDITS.md`, `design/SUNO_PROMPTS.md`.

## Puntos de entrada
- Rutas: `/` → HostApp (lazy), `/join` y `/join/:code` → PlayApp (lazy) — `src/App.tsx`.
- Datos: `rooms/{code}`, `rooms/{code}/players/{uid}`, `presence/{code}/{uid}`, `answers/{code}/{key}/{uid}`.

## Piezas sensibles
- Autenticación: `src/lib/firebase.ts` (`ensureSignedIn`).
- Autorización: `database.rules.json` (+ tests). Modelo: `docs/modelo-de-acceso.md`.
- Respuesta correcta: `src/host/controller.ts` (memoria) y banco en `src/content/` (chunk del host).
- Config/env: `.env.example`, `src/vite-env.d.ts`, `firebase.json` (headers de hosting).

## Índice por área
- Seguridad: `database.rules.json`, `tests/rules/**`, `src/data/room.ts`, `src/lib/firebase.ts`, `src/host/controller.ts`, `firebase.json`, `.env.example`, `src/App.tsx`, `docs/modelo-de-acceso.md`.
- Lógica / requisitos: `src/game/**`, `src/host/controller.ts`, `src/host/RoomScreen.tsx`, `src/play/PlayApp.tsx`, `src/data/room.ts`, `docs/requisitos.md`, `GAME_DESIGN.md` §3–4.
- Cliente (React, UI, accesibilidad, rendimiento): `src/App.tsx`, `src/main.tsx`, `src/host/**`, `src/play/**`, `src/ui/**`, `src/audio/**`, `src/styles/game.css`, `index.html`, `vite.config.ts`.
- Documentación y operación: `README.md`, `CLAUDE.md`, `docs/**`, `GAME_DESIGN.md`, `.env.example`, `package.json`, `firebase.json`, `.firebaserc`, `scripts/**`, `.gitignore`, `design/package.json`, `design/assets/CREDITS.md`.
