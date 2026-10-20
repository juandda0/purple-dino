// Qué se ve y qué suena en cada bloque del guion (src/bloques.js).
//
// Tomas (shots): recortes de las grabaciones reales de public/rec/ (scripts/grabar.mjs).
//   src   win-host | win-phone | lose-host — grabación
//   at    segundo de la grabación que cae en la palabra `word` (o, sin `word`, al inicio de la toma)
//   cut   palabra con la que empieza la toma (la primera empieza con el bloque)
//   rate  velocidad · zoom {s, x, y}: escala y punto fijo (px de la grabación 1920×1080)
//   shake / flash: golpe en la palabra `word` (o al inicio) · phone: celular encima {at, word?, rate?, pos?}
// Textos (captions): {text, word, n?, until?, pos: top|bottom|center, accent?}
// Duración: la frase más su pausa natural en la toma (+ `pausa` extra), estirada a `min` si la imagen lo pide y
// ajustada a compases enteros de la música (timeline.js). fin: aire al final del último bloque. music: ver MUSICA
// Momentos de las grabaciones: public/rec/win.json y lose.json (eventos con su segundo).
export const ESCENAS = {
  clase: {
    min: 2.8, music: 'intense',
    shots: [
      { src: 'win-host', at: 24.6, zoom: { s: 1.35, x: 1290, y: 430 } },
      { src: 'win-host', cut: 'is', word: 'one', at: 37.85, flash: true, shake: true },
    ],
    captions: [
      { text: 'YOUR WHOLE CLASS', word: 'your', pos: 'top' },
      { text: 'IS ONE DINOSAUR', word: 'one', pos: 'bottom', accent: true },
    ],
  },
  espada: {
    min: 1.7, music: 'intense',
    shots: [{ src: 'win-host', word: 'sword', at: 47.26, flash: true, shake: true, zoom: { s: 1.12, x: 960, y: 420 } }],
  },
  rey: { music: 'boss', scene: 'rey' },
  bestias: { pausa: 0.4, music: 'boss', scene: 'bestias' },
  ingles: { pausa: 0.4, music: null, scene: 'ingles' },
  unirse: {
    music: 'battle',
    shots: [
      { src: 'win-host', at: 15.0, rate: 1.3, zoom: { s: 1.45, x: 330, y: 620 }, phone: { at: 16.6, rate: 1.4, word: 'scan' } },
      { src: 'win-host', cut: 'join', at: 21.0, rate: 1.4, zoom: { s: 1.3, x: 1300, y: 470 }, phone: { at: 19.5 } },
    ],
    captions: [
      { text: 'SCAN', word: 'scan', pos: 'top' },
      { text: 'PICK YOUR DINO', word: 'pick', pos: 'top' },
      { text: 'JOIN THE PACK!', word: 'join', pos: 'top', accent: true },
    ],
  },
  pregunta: {
    music: 'battle',
    shots: [{ src: 'win-host', word: 'question', at: 33.3, zoom: { s: 1.12, x: 760, y: 900 }, phone: { at: 35.1, word: 'everybody' } }],
    captions: [{ text: 'ANSWER ON YOUR PHONE', word: 'everybody', pos: 'top' }],
  },
  espadazo: {
    music: 'battle',
    shots: [{ src: 'win-host', word: 'sword', at: 37.85, flash: true, shake: true, phone: { at: 38.25, word: 'sword' } }],
    captions: [{ text: 'MOST GET IT RIGHT?', word: 'if', until: 'sword', pos: 'top' }],
  },
  combo: {
    min: 2.2, music: 'battle',
    shots: [{ src: 'win-host', word: 'combo', at: 115.6, flash: true, shake: true, zoom: { s: 1.15, x: 1500, y: 300 } }],
    captions: [{ text: 'COMBO x3!', word: 'combo', pos: 'bottom', accent: true }],
  },
  escudo: {
    music: 'battle',
    shots: [{ src: 'win-host', word: 'back', at: 60.58, shake: true, phone: { at: 61.0, word: 'cracks' } }],
    captions: [{ text: 'MOST GET IT WRONG?', word: 'get', until: 'back', pos: 'top' }],
  },
  reintento: {
    music: 'battle',
    shots: [
      { src: 'win-host', at: 65.4, zoom: { s: 1.3, x: 760, y: 860 } },
      { src: 'win-host', cut: 'and', at: 66.6, rate: 0.8, phone: { at: 61.7, rate: 0.5, pos: 'center' } },
    ],
    captions: [
      { text: 'ANSWERS SHUFFLED', word: 'answers', pos: 'top' },
      { text: 'STILL A SECRET', word: 'still', pos: 'top', accent: true },
    ],
  },
  ultima: {
    min: 2.3, music: 'intense',
    shots: [{ src: 'win-host', word: 'last', at: 129.3, shake: true, flash: true, zoom: { s: 1.1, x: 960, y: 300 } }],
  },
  panico: {
    music: 'intense',
    shots: [{ src: 'win-host', at: 101.4, rate: 1.35, zoom: { s: 1.18, x: 960, y: 200 } }],
    captions: [{ text: 'PANIC MODE!', word: 'music', pos: 'bottom', accent: true }],
  },
  camino: {
    music: 'boss',
    shots: [
      { src: 'win-host', at: 30.0 },
      { src: 'win-host', cut: 'cave', at: 53.4, flash: true },
      { src: 'win-host', cut: 'swamp', at: 86.0, flash: true },
      { src: 'win-host', cut: 'volcano', at: 121.6, flash: true },
      { src: 'win-host', cut: 'all', at: 153.4, rate: 0.9 },
    ],
  },
  jefe: {
    music: 'boss',
    shots: [{ src: 'win-host', word: 'king', at: 156.9, flash: true, shake: true, zoom: { s: 1.45, x: 960, y: 380 } }],
  },
  victoria: {
    min: 2.6, music: 'victory',
    shots: [
      { src: 'win-host', word: 'beat', at: 192.7, flash: true, shake: true },
      { src: 'win-host', cut: 'princess', at: 198.6, flash: true },
    ],
  },
  derrota: {
    music: 'defeat',
    shots: [
      { src: 'lose-host', word: 'miss', at: 56.1, shake: true },
      { src: 'lose-host', cut: 'and', at: 61.2, rate: 0.8 },
    ],
  },
  juntos: {
    music: 'battle',
    shots: [
      { src: 'win-host', at: 25.4, zoom: { s: 1.2, x: 1290, y: 470 } },
      { src: 'win-host', cut: 'you', at: 38.1, zoom: { s: 1.7, x: 1500, y: 740 }, phone: { at: 38.6 } },
    ],
    captions: [
      { text: 'NO ACCOUNTS', word: 'no', pos: 'bottom' },
      { text: 'NO RANKINGS', word: 'no', n: 2, pos: 'bottom' },
      { text: 'NOBODY LEFT BEHIND', word: 'nobody', pos: 'bottom' },
      { text: 'WIN TOGETHER', word: 'you', pos: 'top', accent: true },
    ],
  },
  profe: {
    music: 'battle',
    shots: [
      { src: 'win-host', at: 5.5 },
      { src: 'win-host', cut: 'pick', at: 7.6 },
      { src: 'win-host', cut: 'difficulty', at: 10.4 },
      { src: 'win-host', cut: 'press', word: 'start', at: 29.46, zoom: { s: 1.25, x: 1650, y: 960 } },
    ],
    captions: [{ text: 'PASSAGES · COURSE 6', word: 'made', until: 'pick', pos: 'bottom' }],
  },
  cierre: {
    fin: 1.6, music: 'battle', scene: 'cierre',
    shots: [{ src: 'win-host', at: 0.4 }],
  },
};

// Pistas del juego (design/assets/audio, copiadas a public/audio) y desde qué segundo arrancan: siempre en
// el tiempo fuerte de un compás (src/compases.json, de scripts/compases.mjs). La victoria se acomoda para
// que su platillo caiga cuando aparece la princesa (timeline.js).
export const MUSICA = {
  intense: { file: 'music_battle_intense.mp3', from: 8.685 },
  boss: { file: 'music_boss.mp3', from: 6.684 },
  battle: { file: 'music_battle.mp3', from: 25.084 },
  victory: { file: 'jingle_victory.mp3', from: 0 },
  defeat: { file: 'jingle_defeat.mp3', from: 0 },
};
