// Guion del tráiler, un bloque por escena (el mismo texto de guion.md, sin las etiquetas de emoción).
// desde/hasta: primera y última palabra del bloque en la transcripción (minúsculas, sin signos);
// pueden ser una lista de variantes por si la transcripción las escribe distinto. «veces»: la n-ésima
// aparición de la última palabra dentro del bloque.
export const BLOQUES = [
  { id: 'clase', desde: 'your', hasta: 'dinosaur', texto: 'Your whole class... is ONE dinosaur.' },
  { id: 'espada', desde: 'and', hasta: 'sword', texto: 'And it has a sword.' },
  { id: 'rey', desde: 'long', hasta: 'castle', texto: 'Long ago, King Dread, the king of shadows, cursed the land... and caged the princess at his castle.' },
  { id: 'bestias', desde: 'five', hasta: ['ashhorn', 'horn', 'ashorn'], texto: 'Five shadow beasts guard the road. The Shade Raptor. Nightwing. Mire Spine. Ashhorn.' },
  { id: 'ingles', desde: 'and', hasta: 'english', texto: 'And the only weapon that can beat them... is English.' },
  { id: 'unirse', desde: 'scan', hasta: 'pack', texto: 'Scan the code. Pick your dino. Join the pack!' },
  { id: 'pregunta', desde: 'a', hasta: ['phone', 'phones'], texto: 'A question hits the screen. Everybody answers on their phone.' },
  { id: 'espadazo', desde: 'if', hasta: 'strike', texto: 'If most of the class gets it right... SWORD STRIKE!' },
  { id: 'combo', desde: 'keep', hasta: 'grows', texto: 'Keep it up, and the combo grows!' },
  { id: 'escudo', desde: 'get', hasta: 'cracks', texto: 'Get it wrong... and the shadows hit back. Your shield cracks.' },
  { id: 'reintento', desde: 'same', hasta: 'secret', texto: 'Same question, answers shuffled. And the right answer? Still a secret.' },
  { id: 'ultima', desde: 'no', hasta: 'chance', texto: 'No shield left? Last chance.' },
  { id: 'panico', desde: ['clock', 'clocks'], hasta: 'too', texto: "Clock running out? The music knows... and it's panicking too." },
  { id: 'camino', desde: 'forest', hasta: 'gate', texto: 'Forest. Cave. Swamp. Volcano. All the way to the castle gate...' },
  { id: 'jefe', desde: 'where', hasta: 'waiting', texto: 'where King Dread is waiting.' },
  { id: 'victoria', desde: 'beat', hasta: 'free', texto: 'Beat him, and the princess is FREE!' },
  { id: 'derrota', desde: 'miss', hasta: 'time', texto: 'Miss too much... and the shadows win. This time.' },
  { id: 'juntos', desde: 'no', hasta: 'together', veces: 2, texto: 'No accounts. No rankings. Nobody left behind. You win together, or you lose together.' },
  { id: 'profe', desde: 'made', hasta: 'start', texto: 'Made for Passages, Course 6. Pick your units, pick your difficulty, and press start.' },
  { id: 'cierre', desde: 'purple', hasta: 'princess', texto: 'Purple Dino. Fight the shadows. Save the princess!' },
];
