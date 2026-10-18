# Auditoría — Purple Dino

**Iteración:** 1 · **Fecha:** 2026-10-18 · **Commit auditado:** `0c3bef0` (+ `eeb874b`, pantalla completa y espada, revisado a mano) · **Modo:** fundación + auditoría completa

Este informe muestra solo lo que sigue abierto. Lo resuelto, descartado o fallido irá a `historial.md`.

## Resumen

Primera versión jugable de punta a punta (proyector + celular, victoria y derrota verificadas con alumnos simulados). La base es sólida: las reglas de seguridad cumplen el modelo de acceso en lo esencial (22 tests en el emulador), la lógica del juego está probada (18 tests), la respuesta correcta nunca llega a la base y el celular pesa ~0,3 MB.

**Lo más grave:**
- Con más de ~24 alumnos el botón START sale de la pantalla.
- Tras "PLAY AGAIN" los celulares quedan bloqueados.
- En un fallo, los votos publicados permiten deducir la respuesta correcta antes del reintento.
- La música ocupa ~300 MB de memoria.
- Falta la pantalla de créditos que exige la licencia de JDSherbert.

| Severidad | Nuevos | Pendientes | Resueltos |
|---|---|---|---|
| CRÍTICO | 1 | 1 | 0 |
| ALTO | 5 | 5 | 0 |
| MEDIO | 19 | 19 | 0 |
| BAJO | 22 | 22 | 0 |
| Oportunidades AHORA | 4 | 4 | 0 |
| Oportunidades PRONTO / DESPUÉS | 10 | 10 | 0 |

## Preparación para producción

| Área | Estado | Por qué |
|---|---|---|
| Seguridad de la aplicación | a medias | Reglas correctas en lo esencial, pero faltan validaciones de tamaño/tipo (L4) y la fuga de votos en el escudo (L3). App Check (Op. B). |
| Ciberseguridad operativa y cadena de suministro | a medias | Sin secretos; dependencias de desarrollo con avisos (L10); build puede salir apuntando al emulador y sourcemaps públicos (L5); falta remoto privado (Op. D). |
| Privacidad y datos sensibles | a medias | Solo nombres de pila, pero las salas abandonadas no se borran solas (Op. E); fuentes de Google exponen la IP de alumnos (L8). |
| Escalabilidad | a medias | El diseño escala; el lobby no muestra a 40 alumnos (L1); plan Spark = ~2 clases a la vez (pregunta abierta). |
| Confiabilidad y recuperación | a medias | Un fallo de red de la profe puede costar una vida (L3); sin aviso de conexión ni ErrorBoundary (L5, Op. F). |
| Observabilidad | falta | Sin reporte de errores ni indicador de conexión (Op. F). |
| Testing | a medias | Reglas y lógica pura con tests; el controlador de la partida (F3, R1–R3) sin tests (Op. C). |
| CI/CD | falta | Sin pipeline ni remoto (Op. A). |
| Documentación y contexto | a medias | Docs base completas; varios datos desactualizados (L9). |

**Veredicto:** no lanzar a clases reales hasta resolver los lotes 1, 2, 3 y 8 (y la licencia de los créditos). El resto puede ir en las siguientes versiones.

### Verificación manual (fuera del repositorio)

- [ ] Crear el proyecto Firebase real: Auth anónima activada, Realtime Database (anotar la región), dominios autorizados.
- [ ] Restringir la API key web en Google Cloud Console al dominio de Hosting y a las APIs que usa.
- [ ] MFA en la cuenta Google dueña del proyecto Firebase.
- [ ] Si se pasa a Blaze: presupuesto con alertas 50/90/100 % y App Check en modo "enforce".
- [ ] Licencias: confirmar DinoCharacters, Pixel UI pack 3, Free Smoke Fx (guardar el texto en el repo); origen de Lamora; permiso de los autores de Landlord si el sitio será público; plan de Suno con el que se generaron las pistas.
- [ ] Remoto privado (GitHub/GitLab) con copia de `design/assets-src/`.
- [ ] Probar con una clase real: conexiones simultáneas y transferencia en la pestaña Usage de Firebase.

## Requisitos

**Estado:** borrador con puntos confirmados (2026-10-18) · **Archivo:** `docs/requisitos.md`

- **Reglas de negocio:**
  - R1–R9 se cumplen en el caso normal.
  - Dos fallan en casos borde: R1/F3 tras PLAY AGAIN (L2), y R3/R4, porque los votos delatan la respuesta (L3).
  - El controlador no tiene tests (Op. C).
- **Flujos críticos:**
  - F1–F4 verificados a mano con alumnos simulados.
  - F1 falla con más de 24 alumnos (L1).
  - Sin tests automáticos de punta a punta.
- **Metas no funcionales:**
  - Cumplidas: carga del celular y contraste de la mayoría de colores.
  - En riesgo: 40 alumnos por sala (L1), contraste del verde (L7), retención de 24 h (Op. E).
  - Supuestas (sin confirmar): escala, plataformas y conectividad.
- **Fuera de alcance:** ningún desvío.

### Preguntas sobre requisitos

1. Si **nadie** puede responder (se cae el Wi-Fi del salón), ¿el juego debe castigar quitando vida (hoy) o esperar y repetir la pregunta sin castigo?
2. Un alumno que se **desconecta a mitad de pregunta** (pantalla bloqueada), ¿cuenta como fallo (hoy) o deja de contar en esa pregunta?
3. ¿Cuántas clases podrían jugar a la vez en el colegio? (el plan gratuito aguanta ~2).
4. ¿Pasar a plan Blaze para borrar las salas abandonadas a las 24 h y validar en el servidor?

## Modelo de acceso

**Estado:** confirmado en lo esencial (2026-10-18) · **Archivo:** `docs/modelo-de-acceso.md`

- **Roles:** profe (host de su sala), alumno, visitante con sesión anónima.
- **Diferencias con el código:**
  - 2 permiten más que el modelo: el host puede renombrar o inventar alumnos (L4.3); cualquiera puede ocupar todos los códigos (L4.5).
  - 0 permiten menos.
  - 1 sin cubrir por el modelo: la profe puede borrar alumnos, ¿es "expulsar"?
- **Hallazgos pendientes de confirmar el modelo:** 0 (la pregunta de abajo solo afecta a L4.3).

### Preguntas abiertas sobre el negocio

1. ¿La profe debe poder **expulsar** a un alumno (por ejemplo, por un nombre inapropiado)? Hoy las reglas se lo permiten (puede borrar su entrada), aunque la interfaz no tiene botón.
2. ¿Cuántas salas puede tener abiertas una profe a la vez? El código asume una; limitarlo a una por sesión frena a quien quiera ocupar todos los códigos (L4.5).

## Documentación y contexto

| Documento | Estado | Qué falta o dejó de ser cierto |
|---|---|---|
| `README.md` | desactualizado | El comando para probar con celulares en la red local no pasa `--host` a Vite (no funciona); dice Java 11+ (es 21+); faltan scripts (`lint`, `typecheck`, `preview`); no dice que `verify` choca con `dev:emu`. |
| `CLAUDE.md` | desactualizado (menor) | Faltan puertos, Java/Node, "qué no tocar a mano" (`public/assets`, `design/assets` son generados) y el choque `verify`/`dev:emu`. |
| `.env.example` | desactualizado | Falta `VITE_EMULATOR_HOST`; menciona `npm run emulators` en vez de `dev:emu`; sin plantilla de producción. |
| `GAME_DESIGN.md` | desactualizado | §7 modelo de datos viejo; música dice "mitad del tiempo / último 25 %" (es un solo umbral, último tercio); "×4/×6" (es ×5); "música de Landlord" (ya es Suno); §4 "vidas = fallos que aguanta" (se pierde con el fallo N). |
| `design/SUNO_PROMPTS.md` | desactualizado | Flujo de integración viejo (`~/Downloads`, editar `music.json`); nombres de archivo; umbrales de música. |
| `design/assets/CREDITS.md` | desactualizado | Landlord ya no aporta música; falta URL/fecha en tres licencias; copia duplicada en `assets-src/`. |
| `docs/requisitos.md` | al día (borrador) | — |
| `docs/modelo-de-acceso.md` | al día | Agregar el caso "votos en el escudo" y la pregunta de expulsar. |
| `docs/operacion.md` | falta | Deploy, rollback, qué hacer si Firebase cae (Op. G). |

**Actualizado en esta corrida:** README, CLAUDE.md, docs/requisitos.md, docs/modelo-de-acceso.md (creados en la fundación, commit `0c3bef0`). **Pendiente de aprobación:** lote 9.

## Stack y skills

- **Etapa actual:** prototipo jugable · **Objetivo:** producción (clases reales) · confirmado por el usuario
- **Contexto de riesgo:**
  - Datos sensibles: no; solo el nombre de pila de alumnos de 16–17 años, borrado al terminar. El negocio confirmó que no aplica un régimen especial.
  - No es multi-tenant, no cobra dinero.
  - Usuarios: profes y alumnos de una institución.
- **Stack:** React 19.3, Vite 7.3, TypeScript 5.9, Zustand 5, Firebase JS SDK 12.19 (RTDB + Auth anónima), Firebase Hosting, Vitest 3.2, ESLint 9.
- **Copia de trabajo:** carpeta principal (proyecto nuevo, sin trabajo de otros) · **Rama de arreglos:** `auditoria/2026-10-18` desde `main@4a62448` (se crea al aplicar el primer lote)

| Skill | Área | ¿Aplica? | Motivo |
|---|---|---|---|
| `vercel-react-best-practices` | cliente | sí | React 19 en todo el frontend |
| `vercel-composition-patterns` | cliente | sí | arquitectura de componentes |
| `web-design-guidelines` | UI / accesibilidad | sí | proyector y celular |
| `frontend-design` | UI | solo sugerencias | gusto visual, nunca hallazgo |
| `firebase-security-rules-auditor` | seguridad | parcial | escrito para Firestore/Storage; se aplicaron sus principios a RTDB |
| `firebase-auth-basics` | seguridad | sí | Auth anónima |
| `firebase-hosting-basics` | seguridad / operación | sí | `firebase.json`, cabeceras |
| `firebase-basics` | operación | sí | CLI, proyecto, emuladores |
| `engineering:testing-strategy` | testing | sí | qué probar del controlador |
| `engineering:documentation` | documentación | sí | inventario de docs |
| `firestore-rules-creation`, `firebase-firestore` | — | no | el proyecto usa Realtime Database |
| `firebase-app-hosting-basics` | — | no | SPA estática, sin SSR |
| `expo-*`, `react-native-*` | — | no | no es app móvil nativa |
| `elevenlabs-*`, `higgsfield-*`, `brightdata-*`, `zapier-*` | — | no | no son de revisión de código |

- **Áreas sin skill:** Realtime Database (reglas, modelado, presencia), auditada con conocimiento general y confianza menor.

### Herramientas corridas

| Herramienta | Resultado | Log |
|---|---|---|
| Escáner de secretos | corrió (`git grep` de patrones de claves; gitleaks/trufflehog no instalados): 0 hallazgos | — |
| Auditor de dependencias | corrió (`npm audit`). Producción: 4 high, ninguno explotable (vienen de Firestore, que la app no incluye en el bundle). Desarrollo: 3 críticas y 8 high en firebase-tools 14, vitest 3 y rules-unit-testing. | `logs/npm-audit-summary.txt` |
| Lint y typecheck | 0 errores, 0 avisos (línea base) | `logs/verify.log` |
| Variables de entorno (código vs `.env.example`) | corrió: falta 1 (`VITE_EMULATOR_HOST`, opcional), sobran 0 | — |

### Skills recomendadas

Para instalarlas, pídelo en el chat (no basta con marcarlas aquí).

| Área | Skill | Fuente (último cambio) | Qué cubre / por qué esta | Riesgos | Cómo instalar |
|---|---|---|---|---|---|
| Testing | `vitest` | github.com/antfu/skills (2026-09-28), MIT, autor del core de Vite/Vitest | config, mocks, fake timers, entornos de Vitest; justo lo que piden los tests del controlador (Op. C) | ninguno encontrado (solo markdown) | copiar `skills/vitest` del clon revisado a `~/.claude/skills/vitest` |
| Realtime Database | ninguna confiable | firebase/agent-skills no tiene skill de RTDB; la única candidata (evanca/flutter-ai-rules) es para Flutter y no trae tests de reglas | — | — | — |

## Lotes

Marca `[x]` en **Aprobar** para que se aplique (o apruébalo en el chat). Cada lote es un commit propio en la rama `auditoria/2026-10-18`, con sus tests, y se puede revertir solo.

### Lote 1 — Lobby para 40 alumnos · CRÍTICO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 1.1 | `src/host/screens/Lobby.tsx:47,76` | Content Handling (`web-design-guidelines`); requisito 40 alumnos, F1 | Medido: con 24 alumnos START queda cortado, con 27 queda fuera de pantalla; con 40 solo se ven 27 tarjetas y la profe no puede empezar. | Panel de alto fijo con pie (BACK/START) fuera de la lista; densidad por tramos (≤15: 3 columnas; >15: 5 columnas compactas). | medio / bajo |

### Lote 2 — Partidas repetidas en la misma sala · ALTO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 2.1 | `src/play/PlayApp.tsx:119-172`, `src/game/rules.ts:121`, `src/host/controller.ts:62` | R1, F3 | Tras PLAY AGAIN las claves de ronda se repiten (`s0q1a0`…). El celular muestra "LOCKED IN" con la respuesta de la partida anterior, no deja responder y cuenta como fallo. Las estadísticas se acumulan entre partidas. | Agregar un número de partida a la clave (`g{n}s…`), ampliar la regex en las reglas y reiniciar el estado del celular al volver al lobby; con tests (reglas y lógica). | bajo / bajo |
| 2.2 | `src/play/PlayApp.tsx:134-144` | R8 | Las estadísticas personales cuentan rondas en las que el alumno no participaba (entró tarde). | Ignorar los resultados de rondas que empezaron antes de que el alumno entrara. | bajo / bajo |

### Lote 3 — Integridad de cada ronda · ALTO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 3.1 | `src/host/controller.ts:142-145` | R3/R4 + modelo de acceso | En un fallo se publican `votes`, `percent` y `eligible`: cualquiera los lee y deduce cuál opción era la correcta antes del reintento. | En el escudo publicar solo el porcentaje; los votos solo con espadazo. Test. | bajo / bajo |
| 3.2 | `controller.ts:16` vs `database.rules.json` (+1500 ms), `PlayApp.tsx:242-255` | F3, R1 | Las respuestas que llegan entre +0,4 s y +1,5 s se aceptan y el celular dice "LOCKED IN", pero no se cuentan. Los botones siguen activos con el contador en 00. | El celular se bloquea en 00 ("TIME'S UP") y se alinean las ventanas (gracia del host = margen de las reglas). | bajo / bajo |
| 3.3 | `controller.ts:123,130-132` | checklist 7 (llamadas de red sin manejo de error) | Si falla la lectura de respuestas de la profe se toma 0 respuestas y se pierde una vida injustamente; si se queda colgada, la partida se congela; si falla publicar la pregunta, igual corre el tiempo. | Usar el último snapshot del listener como fuente (con timeout de la lectura) y reintentar la publicación antes de arrancar el tiempo. | medio / bajo |
| 3.4 | `controller.ts:132-157` | robustez | Después del `await` no revisa si la partida se cerró. | `if (this.disposed) return`. | bajo / bajo |
| 3.5 | `src/data/hooks.ts:24-28` | `rerender-derived-state` (`vercel-react-best-practices`) | Medido: al empezar cada pregunta el temporizador muestra 24–25 durante ~220 ms y puede disparar el "panic" mal. | Actualizar la hora al entrar al efecto y guardar el entero. | bajo / bajo |
| 3.6 | `RoomScreen.tsx:18,27-30,85-87` | `rerender-derived-state-no-effect` | El contador "x/y answered" arranca con el valor anterior y no usa los mismos elegibles que la decisión. | Reiniciarlo con cada pregunta y publicar `eligible` en la pregunta. | bajo / bajo |

### Lote 4 — Reglas de seguridad más estrictas · MEDIO · no seguro (toca autorización) · estado: pendiente

- [ ] Aprobar · requiere responder las preguntas 1 y 2 del modelo de acceso para 4.3 y 4.5

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 4.1 | `database.rules.json:26,18,32-44` | Type safety / storage abuse (`firebase-security-rules-auditor`) | `reveal`, `state`, `config.units` y `question` aceptan campos extra, tamaños enormes y valores fuera de rango (probado: 1 MB en `reveal.percent`). | Validar cada campo con tipo y rango, y `$other: false`. Tests. | bajo / bajo |
| 4.2 | `database.rules.json:13` + `room.ts:28` | Update bypass | Tomar una sala abandonada no reinicia `createdAt` (se puede retener para siempre) ni limpia respuestas/presencia viejas. | Exigir `createdAt = ahora` al cambiar de dueño y limpiar `answers`/`presence` al crear. Tests. | bajo / bajo |
| 4.3 | `database.rules.json:9,50-53` | Field-level vs identity (skill) + modelo | El host puede renombrar o inventar alumnos (probado: nombre ofensivo en otro alumno). | Nombre/dino/creación solo por el propio alumno; borrar sigue permitido si se confirma "expulsar". Tests. | bajo / bajo |
| 4.4 | `database.rules.json:50` | validación de entradas | El nombre acepta caracteres de control y de dirección de texto (puede ocultarse o invertirse en el proyector). | Limpiarlo en el cliente y validarlo en las reglas. | bajo / bajo |
| 4.5 | `database.rules.json:9` | rate limiting (checklist §1) | Un solo usuario puede ocupar los 10 000 códigos (probado: 300 salas sin rechazo) y bloquear el juego 24 h. | Una sala por sesión (índice `hostRooms/{uid}`) + App Check (Op. B). | medio / medio |

### Lote 5 — Despliegue seguro · MEDIO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 5.1 | `src/lib/firebase.ts:9`, `.env.example:3` | separar config dev/prod (checklist §2) | Un build de producción puede salir apuntando al emulador sin aviso. | Emuladores solo en modo desarrollo; el build falla si el proyecto es `demo-` en producción. | bajo / bajo |
| 5.2 | `vite.config.ts:7`, `firebase.json:5` | exposición de código (checklist §2) | Los sourcemaps se publican (incluyen el banco de preguntas legible). | `sourcemap: 'hidden'` y no desplegar `*.map`. | bajo / bajo |
| 5.3 | `firebase.json`, `src/App.tsx:6-21` | caché (área 6), `bundle-dynamic-imports` | `index.html` sin `no-cache` y sin ErrorBoundary: tras un deploy la app puede quedar en blanco (medido en el emulador de Hosting). | `no-cache` para HTML y ErrorBoundary con "Reload". | bajo / bajo |
| 5.4 | `firebase.json:16-23` | CSP (checklist §1, `firebase-hosting-basics`) | Sin CSP ni Permissions-Policy. | Empezar con `Content-Security-Policy-Report-Only`. | bajo / medio |

### Lote 6 — Música más liviana · ALTO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 6.1 | `src/audio/music.ts:64-82`, `Menus.tsx:43` | `bundle-preload`, `bundle-conditional` | Medido: la memoria del proyector pasa de 131 a 445 MB al crear la partida; se piden 17 MB de música a la vez y la del lobby compite con la de la batalla. | Cargar en orden (lobby → batalla → resto bajo demanda), liberar las que ya no suenan y recortar los MP3 al tramo del loop. | medio / medio |
| 6.2 | `src/audio/sfx.ts:26-37`, imágenes de la batalla | `bundle-preload` | Efectos y sprites del primer golpe se bajan en el momento; en Wi-Fi escolar pueden llegar tarde. | Precargarlos durante el lobby. | bajo / bajo |

### Lote 7 — Accesibilidad y legibilidad · ALTO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 7.1 | `game.css:65,114` | WCAG 1.4.3 | Texto blanco sobre verde con contraste 2,42:1 (respuesta verde, START, I'M READY); etiquetas pequeñas blancas sobre rojo 3,93:1. | Texto oscuro en el verde; rojo oscuro en etiquetas pequeñas. | bajo / nulo |
| 7.2 | `Battle.tsx:115-244`, `game.css:73,94` | requisito "legible en proyector" | Etiquetas de 10–14 px: en un proyector 1024×768 quedan en ~8 px. | Subirlas a ≥20 px (fuente Pixelify). | bajo / bajo |
| 7.3 | `PlayApp.tsx:210,263-271`, `game.css:163-169` | Content Handling | En celulares de 320–360 px: encabezado montado con muchas unidades, el 4.º botón fuera de pantalla y palabras largas desbordan. | Tamaños fluidos, `overflow-wrap` y cronómetro fijo arriba. | bajo / bajo |
| 7.4 | `PlayApp.tsx:245-253` | Forms (`web-design-guidelines`) | Al tocar una respuesta no hay feedback hasta que responde el servidor, y tras un error los botones quedan bloqueados con un mensaje genérico. | Bloqueo optimista, estilo de botón presionado y mensajes según el error. | bajo / bajo |
| 7.5 | `PlayApp.tsx`, `Hud.tsx:8,28,39,49` | WCAG 4.1.2, 4.1.3 | Sin regiones vivas en el celular; `aria-label` en `div` sin rol. | `role="status"`, `role="img"`, `role="timer"`. | bajo / bajo |
| 7.6 | `game.css:153-155` | WCAG 2.2.2 | `prefers-reduced-motion` no cubre sprites en bucle, `pop-in`, enemigo ni bloqueo. | Ampliar la regla. | bajo / nulo |
| 7.7 | `PlayApp.tsx:85-106`, `Menus.tsx:73-82`, `HostApp.tsx:37` | Forms, WCAG 2.4.3 | Formulario de unión (descripción inexistente, botón deshabilitado sin explicación, error sin asociar), modal sin Escape ni trampa de foco, toggle de sonido confuso para lectores, foco perdido al cambiar de pantalla, swatches <44 px. | Arreglos puntuales. | bajo / bajo |

### Lote 8 — Créditos y assets publicados · ALTO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 8.1 | `design/assets/CREDITS.md:17` | licencia JDSherbert (crédito obligatorio) | No hay pantalla de créditos en el juego. | Botón "CREDITS" en el inicio con el texto de créditos. | bajo / bajo |
| 8.2 | `scripts/sync-assets.mjs:12-16` | licencias (Pixel1992 prohíbe compartir los archivos sueltos), área 11 | Se publican assets sin uso, algunos de licencia dudosa: Lamora y sus derivados, 5 castillos de reserva, música de Landlord ya reemplazada (~1,5 MB). | Lista blanca de lo que se usa. | bajo / bajo |
| 8.3 | `index.html:9-11` | privacidad (checklist §3), `rendering-resource-hints` | Las fuentes vienen de Google: la IP de cada alumno va a un tercero y, si la red del colegio lo bloquea, retrasa el primer pintado. | Fuentes alojadas en el sitio con `preload`. | bajo / bajo |

### Lote 9 — Documentación al día · MEDIO · seguro (sincronización factual) · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 9.1 | `README.md:27`, `package.json:14` | área 15 | El comando para probar con celulares no funciona. | Script `dev:lan` (emuladores en 0.0.0.0 con config aparte) y README corregido. | bajo / bajo |
| 9.2 | `README.md:13`, `.env.example`, `CLAUDE.md` | área 15 | Java 21+, `VITE_EMULATOR_HOST`, choque `verify`/`dev:emu`, scripts y puertos faltantes, archivos generados. | Sincronizar. | bajo / nulo |
| 9.3 | `GAME_DESIGN.md` §4, §6.2, §7, §8; `design/SUNO_PROMPTS.md`; `CREDITS.md` | área 15 | Modelo de datos, umbral de música, escala ×5, música de Landlord, flujo de Suno, URLs de licencias, copia duplicada de créditos. | Sincronizar con el código. | bajo / nulo |
| 9.4 | `design/package.json:10` | convención "versión exacta" | `^1.2.7`. | Fijar la versión. | bajo / nulo |
| 9.5 | `unit-05.json` `c6-u05-006` | contenido (R: una sola respuesta correcta) | "keep in ___": `contact` también es válida. | Cambiar el distractor. | bajo / nulo |

### Lote 10 — Dependencias de desarrollo · BAJO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 10.1 | `package.json` | área 14 | firebase-tools 14 (tar crítico), vitest 3 (tinypool crítico), rules-unit-testing: solo afectan a la máquina de desarrollo, no al sitio. | Subir a firebase-tools 15, vitest 5 y la versión compatible de rules-unit-testing. | medio / medio |

## Oportunidades

Nunca se aplican solas: marca `[x]` o pídelo en el chat.

**Áreas revisadas:**
- Aplican: seguridad, cadena de suministro, privacidad, escalabilidad, rendimiento, caché, confiabilidad, observabilidad, testing, CI/CD, costos, calidad, accesibilidad, dependencias, documentación.
- No aplican: SEO (solo un `noindex`); internacionalización, porque el producto es monolingüe; analítica, porque no hay métricas de producto en el alcance.

### Oportunidad A — CI mínimo (GitHub Actions) · CI/CD · AHORA · pendiente
- [ ] Aprobar
- **Problema:** nada impide integrar código roto; no hay remoto.
- **Solución:** workflow que corre `npm run verify` con Java 21 y los emuladores en cada push/PR; más adelante, previews de Hosting por PR. **Alternativa:** hook local de pre-push.
- **Costo:** gratis (2 000 min/mes en repo privado).
- **Beneficio:** los tests de reglas y lógica corren siempre.
- **Esfuerzo:** bajo · **Claude:** workflow y docs · **Tú:** crear el remoto privado.

### Oportunidad B — App Check + API key restringida · seguridad · AHORA · pendiente
- [ ] Aprobar
- **Problema:** scripts pueden ocupar códigos, recorrer salas y gastar cuota (L4.5).
- **Solución:** App Check con reCAPTCHA en RTDB y Auth (código listo, se activa con una clave en `.env`) + restringir la API key. **Alternativa:** solo el límite de una sala por sesión.
- **Costo:** gratis a esta escala.
- **Beneficio:** corta el abuso automatizado.
- **Esfuerzo:** medio · **Claude:** código y docs · **Tú:** registrar App Check y la clave en la consola.

### Oportunidad C — Tests del controlador de la partida · testing · AHORA · pendiente
- [ ] Aprobar
- **Problema:** F3 y R1–R3 viven en `controller.ts` sin tests.
- **Solución:** extraer la decisión de la ronda a una función pura y probar el controlador con temporizadores falsos.
  - Casos: idempotencia, quién cuenta, reintento sin `correct`, partida completa medium/hard, fallo de red sin perder vida, dos partidas seguidas.
  - **Alternativa:** Playwright con emulador y celulares simulados.
- **Costo:** sin dependencias nuevas.
- **Beneficio:** protege la mecánica central.
- **Esfuerzo:** medio.

### Oportunidad D — Repo privado y licencias en orden · cadena de suministro · AHORA · pendiente
- [ ] Aprobar
- **Problema:** todo vive en un portátil; `design/assets-src/` tiene archivos cuyas licencias prohíben redistribuirlos sueltos.
- **Solución:** remoto **privado**. Si algún día será público, sacar `assets-src/` del historial ahora, porque es barato con 4 commits.
- **Costo:** gratis.
- **Esfuerzo:** bajo · **Tú:** crear el remoto.

### Oportunidad E — Borrado automático a las 24 h · privacidad · PRONTO · pendiente
- [ ] Aprobar
- **Problema:** las salas abandonadas (pestaña cerrada sin salir) guardan nombres indefinidamente; requisito confirmado: borrar a las 24 h.
- **Solución:** función programada de Firebase (plan Blaze, céntimos al mes). **Alternativa en Spark:** un cron de GitHub Actions con una cuenta de servicio mínima.
- **Esfuerzo:** medio · **Tú:** decidir Blaze (pregunta 4).

### Oportunidad F — Errores y conexión visibles · observabilidad / confiabilidad · PRONTO · pendiente
- [ ] Aprobar
- **Problema:** sin ErrorBoundary ni aviso de conexión. "Sala cerrada" y "error de red" se ven igual. Si la profe cierra la pestaña, los celulares quedan en una pregunta muerta.
- **Solución:** banner "Connection lost" con `.info/connected`, mensajes distintos, timeout al crear la sala, presencia de la profe para avisar a los celulares. **Alternativa:** Sentry (plan gratis, carga diferida, sin datos personales).
- **Esfuerzo:** medio.

### Oportunidad G — `docs/operacion.md` · documentación · PRONTO · pendiente
- [ ] Aprobar
- Deploy, rollback (versiones de Hosting, reglas anteriores), qué mirar en la consola, qué hacer si Firebase cae. Esfuerzo bajo.

### Oportunidad H — `eslint-plugin-jsx-a11y` + prueba axe · accesibilidad · PRONTO · pendiente
- [ ] Aprobar
- El lint actual no detecta errores de ARIA. Plugin (bajo) y, después, axe con Playwright (medio).

### Oportunidad I — Pestaña del proyector en segundo plano · confiabilidad · DESPUÉS · pendiente
- [ ] Aprobar
- Chrome frena los temporizadores de pestañas ocultas; revisar plazos al volver (`visibilitychange`) o usar un Worker.

### Oportunidad J — Renovate/Dependabot + `npm audit` en CI · dependencias · DESPUÉS · pendiente
- [ ] Aprobar

### Oportunidad K — Códigos de 6 dígitos · seguridad · DESPUÉS · pendiente
- [ ] Aprobar
- 100× más difíciles de adivinar; costo: escribir 2 dígitos más.

### Oportunidad L — Validar respuestas en el servidor (Cloud Function) · seguridad · DESPUÉS · pendiente
- [ ] Aprobar
- Quita el banco de respuestas del cliente (riesgo aceptado hoy). Requiere Blaze. Esfuerzo alto.

### Oportunidad M — Quitar `react-router-dom` · rendimiento · DESPUÉS · pendiente
- [ ] Aprobar
- ~20 KB gz menos para el celular con 3 rutas simples.

### Oportunidad N — Estilos repetidos a clases · calidad · DESPUÉS · pendiente
- [ ] Aprobar

## Conflictos por decidir

- Ninguno entre skills. La duda de negocio de "expulsar" (modelo de acceso, pregunta 1) decide si 4.3 deja o quita el borrado de alumnos por la profe.

## A verificar

- Memoria y red en un portátil escolar de 4 GB con Wi-Fi real (L6).
- Cuota de altas anónimas por IP de Firebase Auth con muchas clases tras la misma red del colegio.
- Qué cabecera de caché gana en el Hosting real (`/assets/**` vs `*.js`).

## Lo que está bien y no hay que tocar

- La respuesta correcta nunca se escribe en la base (`question/answer` prohibido, `reveal.correct` solo con espadazo), con tests.
- Respuestas: una sola vez, solo en la ronda actual, con plazo y hora del servidor, y solo si el alumno entró antes de la pregunta; `joinedAt` lo pone el servidor y es inmutable.
- Salas no listables; respuestas y presencia solo para la profe; la raíz niega todo por defecto.
- Separación real proyector/celular: el celular baja ~0,3 MB y nunca el banco de preguntas ni el audio.
- Tabla de dificultad, mayoría estricta, reintento con otro orden y escudo, todo con tests; `finish` idempotente.
- Sprites con CSS `steps()` (≈3 % de CPU en el proyector durante una pregunta), respuestas con color + forma + texto, `safeStorage`, sin secretos en el repo.

## Revisión adversarial

**Veredicto:** no aplica todavía (no se aplicaron lotes de la auditoría).

## Ejecución

| Subagente (temas) | Modelo | Archivos recibidos | Duración | Tokens |
|---|---|---|---|---|
| Seguridad: reglas, auth, datos, hosting, dependencias | Opus (sesión) | ~11 | 6,3 min | 120 k |
| Lógica: reglas de negocio, controlador, celular, banco, tests | Opus (sesión) | ~20 | 4,6 min | 134 k |
| Cliente: React, UI, accesibilidad, rendimiento | Sonnet | ~25 | 14,9 min | 229 k |
| Documentación y operación: docs, CI, costos, higiene | Sonnet | ~18 | 5,5 min | 158 k |

## Verificación

- **Línea base:** typecheck ok, lint ok, tests ok (18), tests de reglas ok (22, con el emulador ya levantado), build ok.
- **Tras los arreglos:** pendiente.
