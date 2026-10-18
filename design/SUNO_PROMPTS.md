# Música con Suno — prompts

En Suno usa el modo **Custom**, activa **Instrumental** y pega en **Style of Music** el bloque "Style" y en **Lyrics** el bloque "Structure". Suno entiende mejor los prompts en inglés.

Todas comparten la misma base para que suenen al mismo juego: chiptune 16-bit oscuro (dark fantasy, no infantil), con sintetizadores de onda cuadrada y triangular como en *Landlord*.

Cuando las tengas, ponlas en `~/Downloads/assets/` con estos nombres y se integran (solo cambia `assets/audio/music.json`):

| Archivo | Momento |
|---|---|
| `music_lobby.mp3` | Lobby (y vuelve tras la victoria) |
| `music_battle.mp3` | Batalla normal |
| `music_battle_intense.mp3` | Misma batalla, intensa (cuando queda la mitad del tiempo o menos) |
| `music_boss_suno.mp3` | Jefe final, King Dread (opcional: hoy es un remix del tema intenso) |
| `jingle_victory.mp3` | Ganar |
| `jingle_defeat.mp3` | Perder |

**Consejos**
- **Batalla intensa:** genérala desde la batalla normal con **Cover** (o *Remix*) usando el prompt intenso. Así conserva la tonalidad, el tempo y la melodía, y el juego puede pasar de una a otra sin corte. El último 25 % del tiempo el juego además acelera la música un 12 % y añade latidos, tic-tac y una subida de ruido.
- **Loops (lobby, batalla, jefe):** si el final hace un cierre, recórtalo con *Crop* en Suno o avísame y busco el punto de loop.
- **Jingles:** Suno genera mínimo ~30 s; recorta a la fanfarria/el remate (≈ 6–15 s).

---

## 1. Lobby — "Gathering the Pack"

**Style**
```
dark fantasy chiptune, 16-bit SNES RPG, instrumental, mysterious but hopeful, steady mid-tempo 100 BPM, D minor, square wave lead, triangle bass, soft arpeggios, light 8-bit drums, night castle mood, seamless loop, no vocals
```
**Structure**
```
[Instrumental]
[Intro: soft arpeggio, 4 bars]
[Main Theme: square lead melody, calm drums]
[Variation: counter-melody, warmer harmony]
[Main Theme]
[Bridge: sparse, waiting, anticipation]
[Main Theme: same as start, no ending, loops back]
```

## 2. Batalla — "Shadow Clash"

**Style**
```
16-bit chiptune battle theme, dark fantasy JRPG boss-lite, instrumental, driving and heroic, 140 BPM, E minor, punchy square lead, fast triangle bassline, noise-channel drums, tense arpeggios, energetic but not frantic, seamless loop, no vocals
```
**Structure**
```
[Instrumental]
[Intro: 2 bars drum fill]
[A Section: heroic lead melody over driving bass]
[B Section: call and response, rising tension]
[A Section]
[Breakdown: bass and drums only, 4 bars]
[A Section: same as start, no ending, loops back]
```

## 3. Batalla intensa — "Shadow Clash (Last Seconds)"
*(genérala con **Cover** sobre la canción 2)*

**Style**
```
16-bit chiptune battle theme, same melody and key, urgent and panicked, 140 BPM with double-time drums, E minor, alarm-like square lead, rapid 16th-note arpeggios, pounding triangle bass, constant noise hi-hats, rising tension, countdown feeling, seamless loop, no vocals
```
**Structure**
```
[Instrumental]
[A Section: double-time drums, urgent lead]
[B Section: rapid arpeggios, rising]
[A Section: alarm lead, pounding bass]
[B Section: maximum tension, no resolution, loops back]
```

## 4. Jefe — "King Dread" *(opcional)*

**Style**
```
epic dark chiptune boss battle, 16-bit, instrumental, menacing and heavy, 150 BPM, C minor, distorted square lead, pipe organ chords, choir-like synth pads, galloping triangle bass, thunderous 8-bit drums, villain castle, seamless loop, no vocals
```
**Structure**
```
[Instrumental]
[Intro: ominous organ chords, 4 bars]
[Boss Theme: menacing lead, galloping bass]
[Rising Section: faster arpeggios, choir pads]
[Boss Theme]
[Breakdown: organ and drums, dread]
[Boss Theme: same as start, no ending, loops back]
```

## 5. Ganar — "Princess Rescued"

**Style**
```
16-bit chiptune victory fanfare, instrumental, triumphant and bright, 140 BPM, C major, square wave trumpets, rising arpeggios, triangle bass, snare roll, short and punchy, dawn after the curse breaks, clear final chord, no vocals
```
**Structure**
```
[Instrumental]
[Fanfare: triplet pickup, rising heroic melody]
[Big Finish: arpeggio up to a held high note, final chord]
[End]
```

## 6. Perder — "The Shadows Win"

**Style**
```
16-bit chiptune game over theme, instrumental, sad and dark but not childish, slow 80 BPM, A minor, descending square lead, chromatic falling line, low triangle bass, soft noise thud, short, ends on a dark minor chord, no vocals
```
**Structure**
```
[Instrumental]
[Game Over: slow descending melody, sighing notes]
[Ending: low thud, dark minor chord, fade]
[End]
```
