# 🦖 Purple Dinosaur — Documento de diseño (v0.3)

> Juego web de quiz en inglés, cooperativo y en tiempo real (tipo Kahoot), estilo pixel art y **en primera persona**.
> Toda la clase es un dinosaurio morado con espada y escudo que avanza hasta el castillo para rescatar a la princesa dinosaurio.
> Las preguntas siguen el libro **Passages (Third Edition)** de Cambridge, que el curso trabaja en **Cambridge One**.
> **Público: estudiantes de 16–17 años.** El tono no es infantil: dark fantasy en pixel art.
> **Todo el juego está en inglés** (menús, botones, mensajes, pantallas del celular). Este documento queda en español porque es para nosotros.

---

## 1. Concepto en una frase

**La clase entera es el dinosaurio.** El dino camina hacia el castillo y se detiene delante de cada enemigo. Si la mayoría acierta, el dino **pega con la espada**; si la mayoría falla, el enemigo golpea y el dino **lo para con el escudo**, que se va rompiendo. Si el escudo ya no está y vuelven a fallar, pierden.

- **Cooperativo, no competitivo**: todos ganan o pierden juntos.
- **Dos pantallas**:
  - **Proyector (profe)**: la vista en primera persona, la pregunta, el temporizador y las animaciones.
  - **Celular (alumno)**: el control. Nombre, botón "Listo" y botones de respuesta.

---

## 2. Roles y flujo

### 2.1 Profe (pantalla grande)

```
[Inicio] → [Curso] → [Unidades] → [Dificultad] → [Lobby] → [Camino + batallas] → [Victoria / Game Over]
```

1. **Inicio**: logo, el dino frente a King Dread y el botón "CREATE GAME".
2. **Elegir curso**: 7 tarjetas grandes (Courses 1 a 7). **Course 6 activo**; los demás aparecen bloqueados con la etiqueta **"COMING SOON"**.
3. **Elegir unidades**: las 12 unidades del libro como fichas seleccionables (selección múltiple, mínimo 1), con un botón "ALL". Ejemplo: para el examen de las unidades 7, 8 y 9 se marcan esas tres.
4. **Elegir dificultad**: Easy / Medium / Hard (ver sección 4).
5. **Lobby**:
   - QR grande + **código de 4 dígitos** (por si a alguien no le funciona la cámara).
   - Resumen de la partida: "Course 6 · Units 7 · 8 · 9 · Medium · 3 lives".
   - Lista de alumnos que van entrando, cada uno con su mini-dino y un ✔ cuando está "Listo".
   - Contador "13 / 15 READY".
   - Botón **"START"** habilitado solo cuando todos están listos.
6. **Camino y batallas**: ver sección 3.
7. **Final**: rescate de la princesa o derrota + botón "PLAY AGAIN" / "TRY AGAIN".

**La profe no edita preguntas.** Todas vienen ya preparadas en el juego (ver sección 5).

### 2.2 Alumno (celular)

```
[Escanea el QR] → [Pone su nombre] → [Sala de espera → "¡Listo!"] → [Responder] → [Final]
```

1. Escanea el QR con la cámara normal del celular → se abre la web con la sala ya puesta. (Alternativa: entrar a la web y escribir el código de 4 dígitos.)
2. Escribe su **nombre**.
3. **Sala de espera**: ve su mini-dino y un botón gigante **"I'M READY"**.
4. **Durante la pregunta**: 4 botones grandes, cada uno con **color, forma y el texto en inglés** de la opción (así leen en inglés y no dependen de ver bien el proyector).
5. **Tras responder**: "LOCKED IN · Waiting for the others…".
6. **Resultado de la ronda**: "SWORD STRIKE!" (dice si acertó y el combo) o "SHIELD BROKEN" (no dice si acertó, para no revelar la respuesta antes del reintento).
7. **Final**: resultado de la clase y su aporte personal (sin ranking público).

---

## 3. Mecánica

### 3.1 Estructura de la partida

**5 paradas en el camino hacia el castillo**:

| Parada | Escenario | Enemigo | Idea |
|---|---|---|---|
| 1 | Forest | **Shade Raptor** – velociraptor de sombra | Rápido, el primer enemigo |
| 2 | The Cave | **Nightwing** – pterodáctilo de sombra | Aparece desde la oscuridad |
| 3 | Swamp | **Mire Spine** – espinosaurio de sombra | Vela de espinas en la espalda |
| 4 | Volcano | **Ashhorn** – tricerátops de sombra | Cuernos y gola, el más pesado |
| 5 | Castle Gate | **King Dread** (jefe) – T-Rex de sombra con corona | Custodia a la princesa enjaulada |

**Todos los enemigos son dinosaurios de sombra**: siluetas casi negras con un borde de luz morado, humo oscuro alrededor y **ojos rojos brillantes**. Al recibir un espadazo destellan en blanco.

Cada enemigo tiene **vida = número de preguntas que hay que acertar** para derrotarlo (depende de la dificultad). Su barra de vida aparece sobre él.

### 3.2 Ciclo de cada pregunta

```
El dino camina (primera persona, las manos se balancean) y se detiene ante el enemigo
   ↓
Pregunta + 4 opciones + temporizador
   ↓
Los alumnos responden (barra "18/25 respondieron")
   ↓
Se acaba el tiempo o respondieron todos
   ↓
Revelación: "72% acertó"  →  ¿más del 50%?
   ├─ SÍ → ESPADAZO: el enemigo pierde 1 de vida
   │        ├─ le queda vida → nueva pregunta
   │        └─ sin vida → explota → el dino sigue caminando a la siguiente parada
   └─ NO → el enemigo ataca → GOLPE AL ESCUDO (se rompe un poco más)
            ├─ aún había escudo → se repite la misma pregunta (opciones en otro orden)
            └─ ya no había escudo → GAME OVER
```

### 3.3 Reglas

| Regla | Decisión |
|---|---|
| **Mayoría** | Más del 50% de los alumnos conectados acierta (50% exacto es fallo). Quien no responde a tiempo cuenta como fallo; quien se desconecta durante la pregunta sin responder no cuenta para esa pregunta (R11). |
| **Vidas = escudo** | El escudo se va rompiendo con cada fallo. **Sin escudo = última vida**: un fallo más y pierden. |
| **Repetición** | Si fallan, se repite **la misma pregunta**, con las opciones **en otro orden**. |
| **No revelar al fallar** | Si la mayoría falla **no se muestra la respuesta correcta**, solo "Solo 38% acertó… ¡otra vez!". La correcta se muestra cuando la mayoría acierta. |
| **Sin repetir** | En una partida no sale dos veces la misma pregunta (salvo la repetición por fallo). |

### 3.4 Estados del escudo (5 sprites)

```
 Intacto  →  Rayado  →  Agrietado  →  Partido  →  Sin escudo (última vida)
```

Cada dificultad usa una parte de estos estados (ver sección 4). Cuando el escudo desaparece, la mano izquierda queda vacía, aparece un borde rojo que late y el texto **"LAST CHANCE"**.

### 3.5 Juice (lo que lo hace divertido)

- **Caminata**: las manos del dino suben y bajan al ritmo de los pasos, fondo con parallax y una mini barra de progreso arriba (dino → castillo).
- **Espadazo**: la espada cruza la pantalla en arco, destello blanco, el enemigo parpadea, salen números de daño y partículas, y **la pantalla tiembla**.
- **Golpe al escudo**: el enemigo se abalanza hacia la cámara, el escudo se sacude, saltan astillas, la pantalla tiembla y se oye un "¡CLANK!".
- **Mensaje grupal**: "Ana, Luis + 9 more struck" (reconocimiento sin ranking individual).
- **Combo**: "COMBO x3" si aciertan varias seguidas a la primera.
- **Escudo por racha**: cada 3 espadazos seguidos a la primera (combo x3, x6…) el escudo recupera un golpe, si había perdido alguno (nunca pasa de las vidas de la dificultad). En el proyector: "STREAK x3 · SHIELD +1", "+1 SHIELD" flotando y el escudo brilla; en el celular, "PACK STREAK · SHIELD +1". Sale en `reveal.shieldUp` (solo con espadazo).
- **Final**: King Dread se desvanece en humo, el dino abre la jaula y la princesa sale; confeti pixel al amanecer. En los dos finales salen los dinos que eligió la clase (hasta 4 colores, los más elegidos), no el morado por defecto: saltan junto a la princesa al ganar y quedan caídos al perder. En cada celular sale el dino de ese alumno.
- **Música chiptune** por escenario + efectos de sonido (solo en el proyector; los celulares en silencio).

---

## 4. Dificultad

El contenido de inglés lo definen **el curso y las unidades** elegidas. La dificultad cambia **cuánto perdona el juego**:

| | 🟢 Easy | 🟡 Medium | 🔴 Hard |
|---|---|---|---|
| Vidas (fallos que aguanta) | 5 | 3 | 2 |
| Estados del escudo | Intacto → Rayado → Agrietado → Partido → Sin escudo | Intacto → Agrietado → Sin escudo | Intacto → Sin escudo |
| Vida de cada enemigo | 1 pregunta | 2 preguntas | 3 preguntas |
| Vida del jefe | 2 preguntas | 3 preguntas | 4 preguntas |
| Tiempo por pregunta | 30 s | 20 s | 15 s |
| Preguntas por partida (sin fallos) | 6 | 11 | 16 |


Las vidas son los fallos que aguanta la clase: **se pierde en el fallo número N** (Easy 5, Medium 3, Hard 2). Con el escudo ya roto queda la última vida, que se juega sin escudo ("LAST CHANCE"); ver `src/game/rules.ts`.

---

## 5. Contenido: cursos, unidades y preguntas

### 5.1 Alcance para la presentación

- **Curso 6** → libro **Passages, Third Edition** (12 unidades). **Todas las preguntas de las 12 unidades quedan preparadas.**
- **Cursos 1–5 y 7** → visibles pero bloqueados: **"Próximamente"**.
- Las preguntas vienen dentro del juego; **la profe no puede editarlas** en esta versión.

### 5.2 Banco de preguntas

- Unas **20 preguntas por unidad** → ~240 preguntas para el Curso 6. Alcanza para una partida Hard con 3 unidades sin repetir.
- Cada pregunta practica el **vocabulario, la gramática o las expresiones** de esa unidad del libro.
- Las preguntas se escriben **desde cero, basadas en los temas y la gramática de cada unidad**. No se copian ejercicios del libro ni de Cambridge One (son material con derechos de autor).
- Formato único: **opción múltiple de 4 respuestas**.
- En la partida se mezclan las preguntas de las unidades elegidas.

```json
{
  "id": "c6-u07-012",
  "course": 6,
  "unit": 7,
  "skill": "grammar",
  "question": "If I ___ more time, I would travel more.",
  "options": ["have", "had", "will have", "having"],
  "answer": 1
}
```

Organización en archivos: `questions/course-6/unit-01.json` … `unit-12.json`.

---

## 6. Vista en primera persona y dirección de arte

### 6.1 Composición de la pantalla de batalla

Vemos **a través de los ojos del dino**: sus dos brazos morados abajo, **escudo en la izquierda** y **espada en la derecha**; el enemigo enfrente, en el centro.

- **Escudo visto por detrás**: escudo de acero (el de *Landlord*); el antebrazo pasa bajo una correa de cuero y el **puño en posición prona** (se ve el dorso de la mano, nudillos arriba) agarra el asa.
- **Espada**: empuñadura en la mano derecha; en el espadazo el brazo entra en diagonal desde abajo a la derecha.
- **Sin escudo**: el brazo izquierdo queda con la mano abierta y el escudo sale volando en pedazos.

```
┌──────────────────────────────────────────────────────────┐
│ 🦖·····●·····○·····○·····○·····🏰    ⏱ 17   UNIT 7·8·9   │
│                                                          │
│                  SHADE RAPTOR  ▓▓▓▓░░                    │
│                        (enemigo)                         │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │   If I ___ more time, I would travel more.           │ │
│ │   🔺 have     🔷 had     ⭐ will have    🟢 having    │ │
│ └──────────────────────────────────────────────────────┘ │
│  🛡️ (mano izq.)                         🗡️ (mano der.)    │
│  [escudo agrietado]           11 / 15 answered  ▓▓▓▓░    │
└──────────────────────────────────────────────────────────┘
```

- El **estado del escudo** se ve en la mano: es el indicador de vidas, no hace falta poner corazones.
- La **barra de camino** arriba muestra cuántos enemigos faltan para el castillo.

### 6.2 Estilo

- **Pixel art 16-bit**, resolución base **320×180** escalada ×5 (escenario de 1600×900) sin suavizado (pixeles nítidos en el proyector).
- **Tono dark fantasy, no infantil** (público de 16–17 años): menús de noche con un castillo a lo lejos, batallas al atardecer, victoria al amanecer y game over de noche.
- **Paleta limitada**, con el **morado** del dino como color de marca, rojo para el peligro y amarillo para los golpes.
- **Protagonista**: dino morado; en batalla solo se ven sus brazos, la espada y el escudo (cuerpo completo en inicio y final). Sin mejillas rosadas ni detalles “tiernos”.
- **Enemigos**: dinosaurios de sombra con ojos rojos (ver 3.1).
- **Princesa**: dinosaurio rosado con corona, en una jaula junto al castillo.
- **Tipografía**: *Press Start 2P* para títulos/HUD y una pixel font más legible (p. ej. *Pixelify Sans* o *VT323*) para las preguntas: en el proyector lo más importante es que el inglés se lea bien.
- **Colores de respuesta** fijos y con forma además de color (accesibilidad): 🔺 rojo, 🔷 azul, ⭐ amarillo, 🟢 verde.
- **UI oscura**: paneles casi negros con borde pixel morado, sombras duras y botones que "se hunden" al presionar. Texto claro y grande para el proyector.
- **Celular**: mismo estilo oscuro, ultra simple, con botones de respuesta enormes.

---

## 7. Propuesta técnica

| Pieza | Decisión | Por qué |
|---|---|---|
| Frontend | **React 19 + Vite + TypeScript** | Rápido; la UI son pantallas que cambian según el estado de Firebase |
| Escena de juego | **HTML/CSS sin motor** (escenario 1600×900 = 320×180 ×5, sprites con animación CSS) | La batalla son capas de sprites y efectos; el texto en HTML se lee mejor en el proyector. Se puede volver a Phaser si hace falta |
| UI (menús, lobby, celular) | HTML/CSS con estilo pixel | Una sola tecnología para las dos pantallas |
| Tiempo real | **Firebase Realtime Database** + Auth anónima | Sin servidor propio, gratis para una clase (hasta 100 conexiones simultáneas) |
| Hosting | **Firebase Hosting** | Un comando para publicar |
| QR | librería `qrcode` | Genera el QR en el lobby |
| Login profe | **Ninguno en v1** | Abre la página y crea la partida |

**Modelo de datos** (tipos en `src/game/types.ts`, acceso en `src/data/room.ts`, permisos en `docs/modelo-de-acceso.md`)

```
rooms/{code}
  hostUid, createdAt
  status: "lobby" | "walking" | "question" | "reveal" | "won" | "lost"
  config: { course, units[], difficulty }
  state: { stop, enemyHp, enemyMaxHp, lives, combo, questionNumber }
  question: { key, text, options[4], unit, attempt, startedAt, endsAt, eligible }   ← SIN la respuesta correcta
  reveal: { key, outcome: "strike" | "shield", percent, answered, eligible,
            votes[], correct, strikers[], moreStrikers, shieldUp }   ← votes/correct/strikers/moreStrikers/shieldUp solo si hubo espadazo
  players/{uid}: { name, avatar, ready, joinedAt }
hostRooms/{uid}: code                     ← una sala por profe
presence/{code}/{uid}: true               ← quién está conectado ahora
answers/{code}/{key}/{uid}: optionIndex   ← una respuesta por alumno y ronda
```

- Clave de ronda (`key`): `{gameId}-s{stop}q{questionNumber}a{attempt}` (`roundKey()` en `src/game/rules.ts`).
- La **pantalla del profe decide cada ronda**: tiene el banco de preguntas, cuenta las respuestas, decide espadazo o golpe y avanza el estado.
- Los celulares **nunca reciben la respuesta correcta** (no se puede hacer trampa).
- Las reglas de seguridad permiten que cada alumno escriba solo su propia respuesta.

---

## 8. Pantallas a diseñar

> **Mockups actuales: HTML local en `design/mockups/`** (abrir `index.html` con un servidor local). Incluyen las 11 pantallas del proyector y las 7 del celular, en inglés y con el estilo nuevo.
> **Assets de terceros (prioridad sobre lo dibujado a mano):** `design/tools/build-assets.js` (`cd design && npm i && npm run assets`) toma los packs de `design/assets-src/` y genera `design/assets/` unificados a la grilla 320×180 (galería en `mockups/assets.html`, créditos y licencias en `design/assets/CREDITS.md`):
> - **POV**: el jugador en primera persona de *Landlord* espejado (escudo izq., espada der.), con los puños repintados como garras moradas de dino; 5 estados del escudo de acero (intacto → rayado → agrietado → partido → sin escudo), bloqueo, ataque y escudo en pedazos.
> - **Dinos**: héroe morado y princesa rosada (con corona) del pack *DinoCharacters*, con todas sus animaciones; 12 avatares de colores para el lobby, y de cada color el salto y la caída (`<color>_jump_3x` / `<color>_dead_3x`) para los finales.
> - **Castillos**: *Sunny Castle #18* (Pixel_1992) = el castillo liberado (victoria). *Lamora* queda generado (`bg/title.png`, `bg/gameover_castle.png`) pero no se usa: con tanto detalle tapaba el título y los textos; inicio y game over usan fondos más limpios (noche con luna y bosque nocturno).
> - **Fondos**: cielos de *Ocean and Clouds* detrás del terreno de `sprites.py`. **UI**: crestas de escudo (vidas), barras de vida, emblemas y marcos de *Pixel UI pack 3*. **FX**: humo e impactos de *Free Smoke Fx*. **Sonido**: UI de JDSherbert y efectos de batalla (golpes, escudo) de *Landlord*; la música no viene de Landlord (ver abajo).
> - **Música** (`mockups/music.js`, prueba en `mockups/musica.html`, `npm run music`): lobby, batalla, jefe, ganar y perder. Durante cada pregunta hay un solo umbral (`PANIC_AT = 1/3` en `src/audio/music.ts`): calma hasta el último tercio del tiempo y luego pánico, con la pista intensa, +12 % de tempo, latido, tic-tac y una subida de ruido; al llegar a 0 suena un golpe y la música baja. Pistas: lobby, batalla, batalla intensa y game over generadas en Suno (prompts en `design/SUNO_PROMPTS.md`), con puntos de loop que saltan el final de cada canción; jefe = remix del tema intenso de Suno con capas de órgano, coro y percusión (`bossRemix()`); victoria compuesta en `build-music.js` (Mi mayor, 150 BPM) y luego vuelve el lobby.
> - Los enemigos de sombra, la jaula y los íconos de respuesta siguen siendo SVG de `design/sprites.py` (no había assets equivalentes).
> El archivo de Paper [Purple Dinosaur](https://app.paper.design/file/01M57SC9KXE01ZE529VFASSG2E) quedó **desactualizado** (estilo infantil, en español, con Gloop); se actualiza cuando vuelva a estar disponible el MCP de Paper.

**Proyector (16:9)**
1. Inicio / título
2. Elegir curso (Curso 6 activo, resto "Próximamente")
3. Elegir unidades (12 fichas, selección múltiple)
4. Elegir dificultad
5. Lobby (QR + código + resumen + lista de alumnos)
6. Caminata (transición entre enemigos)
7. Batalla – pregunta en curso
8. Batalla – espadazo
9. Batalla – golpe al escudo / "LAST CHANCE!"
10. Victoria (princesa rescatada)
11. Game Over

**Celular (vertical)**
- A. Unirse (código + nombre)
- B. Sala de espera ("I'm ready")
- C. Responder (4 botones con texto)
- D. Respuesta enviada / esperando
- E1. Resultado: espadazo
- E2. Resultado: golpe al escudo
- F. Final (victoria)

---

## 9. Fuera de alcance (v1) — ideas para después

- Otros cursos y libros (hoy "Próximamente").
- Editor de preguntas para la profe.
- Estadísticas al final (qué unidades o preguntas costaron más).
- Power-ups (ej. reparar el escudo si aciertan 3 seguidas).
- Preguntas con audio (listening).

---

## 10. Pendiente

- **Preguntas provisionales**: por ahora las 12 unidades del Curso 6 se llenan con preguntas genéricas de **nivel B1**. Cuando llegue el contenido real del libro (temas, gramática y vocabulario de cada unidad), se reemplazan por las definitivas.
