# Créditos de assets de terceros

Las fuentes originales están en `design/assets-src/`; `node tools/build-assets.js` genera `design/assets/` (recortes, recoloreados, escalado Scale3x, etc.).

| Pack | Autor / origen | Licencia | Qué usamos |
|---|---|---|---|
| **Landlord** (LÖVE Jam 2020) | Ferhat Tanman, Eugenia Cheskidova, Sercan Altundaş, Emre Aydın | Juego de jam; sin licencia explícita incluida → **pedir permiso a los autores antes de publicar** | Vista en primera persona (escudo, espada, brazo y animaciones de ataque/bloqueo) con las manos repintadas como garras de dino; sonidos de golpes y escudo (efectos de batalla). Su música ya no se usa |
| **DinoCharacters** (`download.zip`) | Arks / ScissorMarks (itch.io) | Revisar la página del pack (suele ser CC0/libre con crédito) | Héroe (dino morado), princesa (dino rosada + corona), 12 avatares de colores para el lobby |
| **Ocean and Clouds – Free Pixel Art Backgrounds** | CraftPix.net | [CraftPix file license](https://craftpix.net/file-licenses/) (uso comercial permitido, no redistribuir el pack suelto) | Cielos de atardecer, noche con luna y amanecer |
| **Pixel UI pack 3** | (itch.io) | Revisar la página del pack | Crestas de escudo (vidas), barras de vida, anillo de tiempo, estrellas, emblemas, marcos y botones |
| **Sunny Castles** | Pixel_1992 | Licencia comercial del bundle: se puede usar y modificar en juegos propios; **no redistribuir los archivos sueltos**; crédito opcional | Castillo #18 = el castillo liberado en la victoria y en el celular al ganar (otros 5 recortados de reserva: #15, #22, #24, #31, #33) |
| **Lamora.png** | Origen sin indicar | **Sin licencia incluida → confirmar el origen antes de publicar** | Generado pero **sin usar** (demasiado detalle detrás de los textos de inicio y game over) |
| **Música de Suno** | Generada por el equipo con Suno (prompts en `design/SUNO_PROMPTS.md`) | Según el plan de Suno: el plan gratis es solo **uso no comercial**; para publicar o vender, generar con un plan de pago | Lobby (*Castle of Dreams*), batalla (*E Minor Charge*), batalla intensa (*Alarm Arpeggios*, también base del jefe), game over |
| **Victoria (jingle)** | Compuesta para el proyecto (`tools/build-music.js`) a partir de la batalla de Suno: Mi mayor, 150 BPM | Propia | Pantalla de victoria; después vuelve el lobby |
| **Jefe (King Dread)** | Remix hecho para el proyecto (`tools/build-music.js`, `bossRemix()`) sobre la batalla intensa de Suno (*Alarm Arpeggios*, Mi menor): intro de 4 compases de órgano y campana, más capas sintetizadas (órgano, coro, sub-bajo, bombo) que siguen sus acordes | La base es de Suno (mismas condiciones que la fila de Suno); las capas son propias | Batalla del jefe |
| **Free Smoke Fx Pixel 2** | (itch.io / CraftPix) | Revisar la página del pack | Humo de sombra, impactos, polvo |
| **Ultimate UI SFX Pack (FREE)** | JDSherbert | Uso comercial y no comercial **con crédito obligatorio** a JDSherbert | Sonidos de interfaz (hover, seleccionar, atrás, popup, error) |

Crédito que muestra la pantalla **CREDITS** del juego (inicio → CREDITS; el texto está en `src/host/screens/Menus.tsx`): *UI SFX by JDSherbert · First-person art & sounds from "Landlord" (Love Jam 2020) · Dinos by Arks · Backgrounds by CraftPix.net · Castles by Pixel_1992*.

**Tipografías**: Press Start 2P (CodeMan38) y Pixelify Sans, bajo SIL Open Font License, incluidas en el juego con los paquetes npm `@fontsource/press-start-2p` y `@fontsource/pixelify-sans`.

## No usados
- **191_loop.wav** (origen sin indicar) — era la batalla del jefe; reemplazada por el remix de Suno. Sigue en `assets-src/music/` pero ya no se usa.
- **Haven v.7.0.1** — es el juego completo *Haven: Secret of Caledria* (RPG Maker MZ) con sus imágenes y audio cifrados. No es un pack de assets ni trae licencia de reutilización, así que no se extrajo nada.
- **Medieval Village MegaKit** (Quaternius, CC0) — son modelos 3D (glTF/FBX/OBJ), no pixel art. Se podría renderizar algún edificio a pixel art más adelante.
