# Purple Dino

Quiz cooperativo de inglés para clase: la profe proyecta la batalla (`/`) y los alumnos responden desde el celular (`/join/:code`). Diseño: [GAME_DESIGN.md](GAME_DESIGN.md) · Requisitos: [docs/requisitos.md](docs/requisitos.md) · Permisos: [docs/modelo-de-acceso.md](docs/modelo-de-acceso.md).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev:emu` | Emuladores de Firebase (auth + database) + Vite en http://127.0.0.1:5173 |
| `npm run dev:lan` | Igual, pero con emuladores en `0.0.0.0` (`firebase.lan.json`) y Vite `--host`, para probar con celulares en la misma red |
| `npm run verify` | typecheck + lint + tests + tests de reglas (emulador) + build. Levanta su propio emulador de Database: falla con "port taken" si `dev:emu` está corriendo; en ese caso `npx vitest run --config vitest.rules.config.ts` (usa su propio namespace, `demo-purple-dino-rules`: no borra las salas del juego abierto) |
| `npm test` | Tests de la lógica del juego (Vitest) |
| `npm run test:rules` | Tests de `database.rules.json` contra el emulador |
| `npm run assets` | Copia `design/assets` + sprites a `public/assets` (corre solo antes de dev/build) |
| `npm run deploy` | `check:env` (rechaza config demo) + build + deploy de database y hosting al alias `prod` (`purple-dino-juandda0`, https://purple-dino-juandda0.web.app); la config real va en `.env.production.local` |
| `cd design && npm run assets` / `npm run music` | Regenera sprites/fondos/UI y la música desde `design/assets-src/` |

Puertos: Vite 5173, Auth emulator 9099, Database emulator 9000, Emulator UI 4000 (`firebase.json`). Requisitos: Node 22+ y Java 21+ (firebase-tools).

**No editar a mano**: `public/assets/` (lo genera `scripts/sync-assets.mjs` desde `design/assets/` con una lista explícita; un asset nuevo se agrega ahí) ni `design/assets/` (lo generan los scripts de `design/tools/`; los fuentes están en `design/assets-src/`). `public/assets/` y `dist/` están en `.gitignore`.

## Estructura

- `src/game/` lógica pura (reglas, banco de preguntas, paradas) — con tests.
- `src/data/` todo el acceso a Realtime Database (`room.ts`) y hooks.
- `src/host/` app del proyector: controlador de la partida (`controller.ts`), pantallas, estado local (Zustand).
- `src/play/` app del celular. `src/ui/` componentes compartidos. `src/audio/` música y efectos (solo proyector).
- `src/content/questions/course-6/unit-XX.json` banco de preguntas (provisional B1).
- `design/` mockups, generadores de assets y packs de terceros (`assets-src/`, créditos en `design/assets/CREDITS.md`).

## Decisiones

- **React 19 + Vite + TypeScript, sin motor de juego**: la escena es HTML/CSS (escenario 1600×900 = grilla 320×180 ×5). Se puede revisar si el juego necesita movimiento libre o muchas partículas.
- **Firebase Realtime Database** + Auth anónima + Hosting. Sin Cloud Functions en v1: la pantalla del host decide cada ronda.
- La **respuesta correcta nunca se escribe en la base**; solo vive en la memoria del host y se publica en `reveal.correct` si hubo espadazo.
- El host y el celular son **chunks separados** (`lazy`): los celulares no descargan el banco de preguntas ni el audio.
- Batalla con música en 2 estados (calm / panic en el último tercio del tiempo).

## Convenciones

- **Autorización en las reglas, no en la UI.** Todo cambio de permisos va con tests en `tests/rules/` que codifiquen el [modelo de acceso](docs/modelo-de-acceso.md) (casos positivos y negativos). Nunca se prueba contra la base real.
- Reglas de negocio (mayoría, vidas, reintento, elegibles) en `src/game/rules.ts`, puras y con tests; los componentes no las reimplementan.
- Acceso a datos solo desde `src/data/`. Tiempos de pregunta con la hora del servidor (`serverNow()`).
- React (skill `vercel-react-best-practices`): imports directos (sin barrels), estado derivado en el render, refs para valores que cambian rápido, no definir componentes dentro de componentes, `ternario` en vez de `&&` con números.
- UI accesible (skill `web-design-guidelines`): botones reales, `aria-*` en controles de estado, color + forma + texto en respuestas, `prefers-reduced-motion`.
- Todo el texto del juego en inglés; documentación en español.
- Assets: primero los packs de terceros de `design/assets-src/` (modificados para unificar el estilo); dibujar desde cero solo si no hay pack. Créditos al día.
- Secretos: no hay. La config web de Firebase va en `.env.local` (ver `.env.example`); no es secreta, la seguridad está en las reglas.
- Dependencias con versión exacta (`--save-exact`).
