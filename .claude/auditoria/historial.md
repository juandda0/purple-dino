# Historial de auditoría — Purple Dino

Lo resuelto, descartado o fallido de las corridas anteriores, para consulta. `AUDITORIA.md` no lo repite y las corridas siguientes no lo vuelven a leer.

## Iteración 1 → 2, 2026-10-18

Rama `auditoria/2026-10-18` (base `main`, sin push ni merge). El usuario aprobó los lotes 1–9 en el chat el 2026-10-18; cada uno se aplicó en un commit propio. Los resultados resumen lo aplicado según el arreglo propuesto; el texto de cada lote es el de la iteración 1.

| Lote | Commit | Resultado |
|---|---|---|
| 1 | `4784de9` | El lobby muestra a 40 alumnos con START y BACK siempre visibles (verificado con 40 bots). |
| 2 | `379ef6b` | Las claves de ronda llevan el número de partida; el celular se reinicia al volver al lobby y PLAY AGAIN deja responder (verificado en el navegador). |
| 3 | `98240b2` | El escudo publica solo el porcentaje, el celular se bloquea en 00, las ventanas de gracia se alinean y la decisión usa el último snapshot con timeout (queda el caso del timeout, 11.3). |
| 4 | `69411f1` | Las reglas validan tipos, rangos y campos extra; una sala por profe con índice `hostRooms`; el nombre y el dino los escribe solo el propio alumno (la profe solo puede borrar); tests en `tests/rules/`. |
| 5 | `7e4dafa` | El build de producción rechaza la config de emulador, sourcemaps ocultos, `no-cache` para el HTML, ErrorBoundary y CSP. |
| 6 | `ddeb671` | La música carga por etapas y libera lo que no suena; efectos y sprites del primer golpe se precargan en el lobby. |
| 7 | `3529754` | Contraste, etiquetas legibles en proyector, celular de 320 px, regiones vivas, `prefers-reduced-motion` y formularios accesibles. |
| 8 | `14d578a` + `df62356` | Pantalla CREDITS, lista blanca de assets publicados, fuentes alojadas en el sitio y fondo (backdrop) a pantalla completa. |
| 9 | `35eb9e5` | README, CLAUDE.md, `.env.example`, GAME_DESIGN, SUNO_PROMPTS y CREDITS sincronizados; script `dev:lan`; versión exacta en `design/`; distractor de `c6-u05-006` corregido. |

### Respuestas del negocio (2026-10-18)

| Pregunta | Respuesta | Efecto |
|---|---|---|
| ¿La profe puede expulsar a un alumno? | Sí. | 4.3 deja el borrado de alumnos por la profe; botón × por alumno en el lobby (`bc353fc`); el celular muestra "YOU LEFT THE PACK" y puede volver a entrar. |
| ¿Cuántas salas por profe? | Una. | 4.5: índice `hostRooms/{uid}`; crear otra sala borra la anterior. |
| Si nadie pudo responder, ¿se pierde vida? | No: no se quita vida y la pregunta se repite. | Regla ya implementada en el controlador; el caso de timeout de lectura sigue abierto como 11.3. |

### Revisión adversarial: intentos revertidos

- `bc353fc` agregó "re-preguntar si la pregunta llegó tarde a la base" y un banner de conexión basado en escrituras rechazadas. La ronda 2 los marcó como fallo (bucle con red lenta sostenida; el banner no se muestra con Wi-Fi caído porque `update()` se encola). Revertidos en `d594d61`, estado **falló**; el problema real pasó a 11.1 y 11.2.

### Lotes 1–9 (texto original)

#### Lote 1 — Lobby para 40 alumnos · CRÍTICO · no seguro · estado: resuelto (`4784de9`)

- [x] Aprobado en el chat (2026-10-18)

**Resultado:** El lobby muestra a 40 alumnos con START y BACK siempre visibles (verificado con 40 bots).

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 1.1 | `src/host/screens/Lobby.tsx:47,76` | Content Handling (`web-design-guidelines`); requisito 40 alumnos, F1 | Medido: con 24 alumnos START queda cortado, con 27 queda fuera de pantalla; con 40 solo se ven 27 tarjetas y la profe no puede empezar. | Panel de alto fijo con pie (BACK/START) fuera de la lista; densidad por tramos (≤15: 3 columnas; >15: 5 columnas compactas). | medio / bajo |

#### Lote 2 — Partidas repetidas en la misma sala · ALTO · no seguro · estado: resuelto (`379ef6b`)

- [x] Aprobado en el chat (2026-10-18)

**Resultado:** Las claves de ronda llevan el número de partida; el celular se reinicia al volver al lobby y PLAY AGAIN deja responder (verificado en el navegador).

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 2.1 | `src/play/PlayApp.tsx:119-172`, `src/game/rules.ts:121`, `src/host/controller.ts:62` | R1, F3 | Tras PLAY AGAIN las claves de ronda se repiten (`s0q1a0`…). El celular muestra "LOCKED IN" con la respuesta de la partida anterior, no deja responder y cuenta como fallo. Las estadísticas se acumulan entre partidas. | Agregar un número de partida a la clave (`g{n}s…`), ampliar la regex en las reglas y reiniciar el estado del celular al volver al lobby; con tests (reglas y lógica). | bajo / bajo |
| 2.2 | `src/play/PlayApp.tsx:134-144` | R8 | Las estadísticas personales cuentan rondas en las que el alumno no participaba (entró tarde). | Ignorar los resultados de rondas que empezaron antes de que el alumno entrara. | bajo / bajo |

#### Lote 3 — Integridad de cada ronda · ALTO · no seguro · estado: resuelto (`98240b2`)

- [x] Aprobado en el chat (2026-10-18)

**Resultado:** El escudo publica solo el porcentaje, el celular se bloquea en 00, las ventanas de gracia se alinean y la decisión usa el último snapshot con timeout (queda el caso del timeout, 11.3).

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 3.1 | `src/host/controller.ts:142-145` | R3/R4 + modelo de acceso | En un fallo se publican `votes`, `percent` y `eligible`: cualquiera los lee y deduce cuál opción era la correcta antes del reintento. | En el escudo publicar solo el porcentaje; los votos solo con espadazo. Test. | bajo / bajo |
| 3.2 | `controller.ts:16` vs `database.rules.json` (+1500 ms), `PlayApp.tsx:242-255` | F3, R1 | Las respuestas que llegan entre +0,4 s y +1,5 s se aceptan y el celular dice "LOCKED IN", pero no se cuentan. Los botones siguen activos con el contador en 00. | El celular se bloquea en 00 ("TIME'S UP") y se alinean las ventanas (gracia del host = margen de las reglas). | bajo / bajo |
| 3.3 | `controller.ts:123,130-132` | checklist 7 (llamadas de red sin manejo de error) | Si falla la lectura de respuestas de la profe se toma 0 respuestas y se pierde una vida injustamente; si se queda colgada, la partida se congela; si falla publicar la pregunta, igual corre el tiempo. | Usar el último snapshot del listener como fuente (con timeout de la lectura) y reintentar la publicación antes de arrancar el tiempo. | medio / bajo |
| 3.4 | `controller.ts:132-157` | robustez | Después del `await` no revisa si la partida se cerró. | `if (this.disposed) return`. | bajo / bajo |
| 3.5 | `src/data/hooks.ts:24-28` | `rerender-derived-state` (`vercel-react-best-practices`) | Medido: al empezar cada pregunta el temporizador muestra 24–25 durante ~220 ms y puede disparar el "panic" mal. | Actualizar la hora al entrar al efecto y guardar el entero. | bajo / bajo |
| 3.6 | `RoomScreen.tsx:18,27-30,85-87` | `rerender-derived-state-no-effect` | El contador "x/y answered" arranca con el valor anterior y no usa los mismos elegibles que la decisión. | Reiniciarlo con cada pregunta y publicar `eligible` en la pregunta. | bajo / bajo |

#### Lote 4 — Reglas de seguridad más estrictas · MEDIO · no seguro (toca autorización) · estado: resuelto (`69411f1`)

- [x] Aprobado en el chat (2026-10-18) · 4.3 y 4.5 desbloqueados por las respuestas del negocio

**Resultado:** Las reglas validan tipos, rangos y campos extra; una sala por profe con índice `hostRooms`; el nombre y el dino los escribe solo el propio alumno (la profe solo puede borrar); tests en `tests/rules/`.

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 4.1 | `database.rules.json:26,18,32-44` | Type safety / storage abuse (`firebase-security-rules-auditor`) | `reveal`, `state`, `config.units` y `question` aceptan campos extra, tamaños enormes y valores fuera de rango (probado: 1 MB en `reveal.percent`). | Validar cada campo con tipo y rango, y `$other: false`. Tests. | bajo / bajo |
| 4.2 | `database.rules.json:13` + `room.ts:28` | Update bypass | Tomar una sala abandonada no reinicia `createdAt` (se puede retener para siempre) ni limpia respuestas/presencia viejas. | Exigir `createdAt = ahora` al cambiar de dueño y limpiar `answers`/`presence` al crear. Tests. | bajo / bajo |
| 4.3 | `database.rules.json:9,50-53` | Field-level vs identity (skill) + modelo | El host puede renombrar o inventar alumnos (probado: nombre ofensivo en otro alumno). | Nombre/dino/creación solo por el propio alumno; borrar sigue permitido si se confirma "expulsar". Tests. | bajo / bajo |
| 4.4 | `database.rules.json:50` | validación de entradas | El nombre acepta caracteres de control y de dirección de texto (puede ocultarse o invertirse en el proyector). | Limpiarlo en el cliente y validarlo en las reglas. | bajo / bajo |
| 4.5 | `database.rules.json:9` | rate limiting (checklist §1) | Un solo usuario puede ocupar los 10 000 códigos (probado: 300 salas sin rechazo) y bloquear el juego 24 h. | Una sala por sesión (índice `hostRooms/{uid}`) + App Check (Op. B). | medio / medio |

#### Lote 5 — Despliegue seguro · MEDIO · no seguro · estado: resuelto (`7e4dafa`)

- [x] Aprobado en el chat (2026-10-18)

**Resultado:** El build de producción rechaza la config de emulador, sourcemaps ocultos, `no-cache` para el HTML, ErrorBoundary y CSP.

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 5.1 | `src/lib/firebase.ts:9`, `.env.example:3` | separar config dev/prod (checklist §2) | Un build de producción puede salir apuntando al emulador sin aviso. | Emuladores solo en modo desarrollo; el build falla si el proyecto es `demo-` en producción. | bajo / bajo |
| 5.2 | `vite.config.ts:7`, `firebase.json:5` | exposición de código (checklist §2) | Los sourcemaps se publican (incluyen el banco de preguntas legible). | `sourcemap: 'hidden'` y no desplegar `*.map`. | bajo / bajo |
| 5.3 | `firebase.json`, `src/App.tsx:6-21` | caché (área 6), `bundle-dynamic-imports` | `index.html` sin `no-cache` y sin ErrorBoundary: tras un deploy la app puede quedar en blanco (medido en el emulador de Hosting). | `no-cache` para HTML y ErrorBoundary con "Reload". | bajo / bajo |
| 5.4 | `firebase.json:16-23` | CSP (checklist §1, `firebase-hosting-basics`) | Sin CSP ni Permissions-Policy. | Empezar con `Content-Security-Policy-Report-Only`. | bajo / medio |

#### Lote 6 — Música más liviana · ALTO · no seguro · estado: resuelto (`ddeb671`)

- [x] Aprobado en el chat (2026-10-18)

**Resultado:** La música carga por etapas y libera lo que no suena; efectos y sprites del primer golpe se precargan en el lobby.

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 6.1 | `src/audio/music.ts:64-82`, `Menus.tsx:43` | `bundle-preload`, `bundle-conditional` | Medido: la memoria del proyector pasa de 131 a 445 MB al crear la partida; se piden 17 MB de música a la vez y la del lobby compite con la de la batalla. | Cargar en orden (lobby → batalla → resto bajo demanda), liberar las que ya no suenan y recortar los MP3 al tramo del loop. | medio / medio |
| 6.2 | `src/audio/sfx.ts:26-37`, imágenes de la batalla | `bundle-preload` | Efectos y sprites del primer golpe se bajan en el momento; en Wi-Fi escolar pueden llegar tarde. | Precargarlos durante el lobby. | bajo / bajo |

#### Lote 7 — Accesibilidad y legibilidad · ALTO · no seguro · estado: resuelto (`3529754`)

- [x] Aprobado en el chat (2026-10-18)

**Resultado:** Contraste, etiquetas legibles en proyector, celular de 320 px, regiones vivas, `prefers-reduced-motion` y formularios accesibles.

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 7.1 | `game.css:65,114` | WCAG 1.4.3 | Texto blanco sobre verde con contraste 2,42:1 (respuesta verde, START, I'M READY); etiquetas pequeñas blancas sobre rojo 3,93:1. | Texto oscuro en el verde; rojo oscuro en etiquetas pequeñas. | bajo / nulo |
| 7.2 | `Battle.tsx:115-244`, `game.css:73,94` | requisito "legible en proyector" | Etiquetas de 10–14 px: en un proyector 1024×768 quedan en ~8 px. | Subirlas a ≥20 px (fuente Pixelify). | bajo / bajo |
| 7.3 | `PlayApp.tsx:210,263-271`, `game.css:163-169` | Content Handling | En celulares de 320–360 px: encabezado montado con muchas unidades, el 4.º botón fuera de pantalla y palabras largas desbordan. | Tamaños fluidos, `overflow-wrap` y cronómetro fijo arriba. | bajo / bajo |
| 7.4 | `PlayApp.tsx:245-253` | Forms (`web-design-guidelines`) | Al tocar una respuesta no hay feedback hasta que responde el servidor, y tras un error los botones quedan bloqueados con un mensaje genérico. | Bloqueo optimista, estilo de botón presionado y mensajes según el error. | bajo / bajo |
| 7.5 | `PlayApp.tsx`, `Hud.tsx:8,28,39,49` | WCAG 4.1.2, 4.1.3 | Sin regiones vivas en el celular; `aria-label` en `div` sin rol. | `role="status"`, `role="img"`, `role="timer"`. | bajo / bajo |
| 7.6 | `game.css:153-155` | WCAG 2.2.2 | `prefers-reduced-motion` no cubre sprites en bucle, `pop-in`, enemigo ni bloqueo. | Ampliar la regla. | bajo / nulo |
| 7.7 | `PlayApp.tsx:85-106`, `Menus.tsx:73-82`, `HostApp.tsx:37` | Forms, WCAG 2.4.3 | Formulario de unión (descripción inexistente, botón deshabilitado sin explicación, error sin asociar), modal sin Escape ni trampa de foco, toggle de sonido confuso para lectores, foco perdido al cambiar de pantalla, swatches <44 px. | Arreglos puntuales. | bajo / bajo |

#### Lote 8 — Créditos y assets publicados · ALTO · no seguro · estado: resuelto (`14d578a` + `df62356`)

- [x] Aprobado en el chat (2026-10-18)

**Resultado:** Pantalla CREDITS, lista blanca de assets publicados, fuentes alojadas en el sitio y fondo (backdrop) a pantalla completa.

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 8.1 | `design/assets/CREDITS.md:17` | licencia JDSherbert (crédito obligatorio) | No hay pantalla de créditos en el juego. | Botón "CREDITS" en el inicio con el texto de créditos. | bajo / bajo |
| 8.2 | `scripts/sync-assets.mjs:12-16` | licencias (Pixel1992 prohíbe compartir los archivos sueltos), área 11 | Se publican assets sin uso, algunos de licencia dudosa: Lamora y sus derivados, 5 castillos de reserva, música de Landlord ya reemplazada (~1,5 MB). | Lista blanca de lo que se usa. | bajo / bajo |
| 8.3 | `index.html:9-11` | privacidad (checklist §3), `rendering-resource-hints` | Las fuentes vienen de Google: la IP de cada alumno va a un tercero y, si la red del colegio lo bloquea, retrasa el primer pintado. | Fuentes alojadas en el sitio con `preload`. | bajo / bajo |

#### Lote 9 — Documentación al día · MEDIO · seguro (sincronización factual) · estado: resuelto (`35eb9e5`)

- [x] Aprobado en el chat (2026-10-18)

**Resultado:** README, CLAUDE.md, `.env.example`, GAME_DESIGN, SUNO_PROMPTS y CREDITS sincronizados; script `dev:lan`; versión exacta en `design/`; distractor de `c6-u05-006` corregido.

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 9.1 | `README.md:27`, `package.json:14` | área 15 | El comando para probar con celulares no funciona. | Script `dev:lan` (emuladores en 0.0.0.0 con config aparte) y README corregido. | bajo / bajo |
| 9.2 | `README.md:13`, `.env.example`, `CLAUDE.md` | área 15 | Java 21+, `VITE_EMULATOR_HOST`, choque `verify`/`dev:emu`, scripts y puertos faltantes, archivos generados. | Sincronizar. | bajo / nulo |
| 9.3 | `GAME_DESIGN.md` §4, §6.2, §7, §8; `design/SUNO_PROMPTS.md`; `CREDITS.md` | área 15 | Modelo de datos, umbral de música, escala ×5, música de Landlord, flujo de Suno, URLs de licencias, copia duplicada de créditos. | Sincronizar con el código. | bajo / nulo |
| 9.4 | `design/package.json:10` | convención "versión exacta" | `^1.2.7`. | Fijar la versión. | bajo / nulo |
| 9.5 | `unit-05.json` `c6-u05-006` | contenido (R: una sola respuesta correcta) | "keep in ___": `contact` también es válida. | Cambiar el distractor. | bajo / nulo |
