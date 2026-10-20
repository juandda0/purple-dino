# Tráiler de Purple Dino — guion para ElevenLabs

Tráiler horizontal (16:9) de unos 90 segundos, frenético y divertido, que explica todo el juego y
cuenta un poco del lore. La imagen es una partida real grabada del juego (proyector y celular). La
música es la del juego: lobby → batalla → pánico → jefe → victoria.

Solo necesito de ti **un archivo**: la voz.

---

## Cómo generar la voz (ElevenLabs → Text to Speech)

1. Modelo: **Eleven v3**. Es el que entiende las etiquetas entre corchetes, como `[excited]` o
   `[whispers]`: no las lee, las actúa. Con otro modelo las leería en voz alta, así que si no usas
   v3, bórralas antes.
2. Voz: una de tráiler con energía, que pueda sonar épica en el lore y divertida en el resto.
   Busca en **Voice Library** "trailer", "epic narrator" o "hype". Pruébala con el bloque 1 antes
   de generar todo.
3. Copia el texto de abajo **completo y tal cual**, con las líneas en blanco, y genera. Cada párrafo
   es una escena, y la línea en blanco le da al narrador la pausa entre escenas.
4. Genera varias tomas y quédate con la que tenga más energía. Guárdala como:
   `/home/juan/Desktop/Me/Proyectos personales/PurpleDinosaur/promo/public/voz/trailer.mp3`
5. Me avisas y corro `npm run voz` en `promo/`. Eso transcribe la toma con marcas de tiempo, la corta
   entre palabras y acomoda cada escena a lo que dure su frase. La entonación queda tal cual sale de
   ElevenLabs.

Si la toma queda lenta, sube **Speed** a 1,1. Tiene que sonar como un tráiler de videojuego:
rápido y con ganas, y muy dramático en las partes de King Dread.

```
[excited] Your whole class... is ONE dinosaur.

And it has a sword.

[dramatic, low voice] Long ago, King Dread, the king of shadows, cursed the land... and caged the princess at his castle.

Five shadow beasts guard the road. The Shade Raptor. Nightwing. Mire Spine. Ashhorn.

And the only weapon that can beat them... [whispers] is English.

[upbeat] Scan the code. Pick your dino. Join the pack!

A question hits the screen. Everybody answers on their phone.

If most of the class gets it right... [shouts] SWORD STRIKE!

Keep it up, and the combo grows!

Get it wrong... and the shadows hit back. Your shield cracks.

Same question, answers shuffled. And the right answer? Still a secret.

No shield left? [tense] Last chance.

Clock running out? The music knows... [laughs] and it's panicking too.

Forest. Cave. Swamp. Volcano. All the way to the castle gate...

[dramatic] where King Dread is waiting.

[excited] Beat him, and the princess is FREE!

Miss too much... and the shadows win. [sighs] This time.

No accounts. No rankings. Nobody left behind. You win together, or you lose together.

Made for Passages, Course 6. Pick your units, pick your difficulty, and press start.

Purple Dino. Fight the shadows. Save the princess!
```

---

## Qué muestra el video mientras habla el narrador

| # | Escena | Imagen | Música |
| --- | --- | --- | --- |
| 1–2 | Gancho | Espadazo en primera persona, temblor y combo, sin logo al inicio | Batalla intensa, a golpe |
| 3 | El rey | King Dread, el castillo y la jaula de la princesa | Lobby (oscura) |
| 4 | Las bestias | Cada enemigo entra con su nombre, al ritmo del narrador | Lobby |
| 5 | El arma | Silencio y remate: «ENGLISH» | Corte seco |
| 6 | Unirse | Lobby con el QR y los alumnos llegando + el celular de Juli | Batalla (arranca) |
| 7 | La pregunta | Pregunta en el proyector y respuesta en el celular | Batalla |
| 8–9 | Espadazo y combo | Espadazo, «72% got it», COMBO x2 | Batalla |
| 10–11 | Escudo | El enemigo ataca, CLANK!, reintento con las respuestas barajadas | Batalla |
| 12–13 | Última oportunidad y pánico | LAST CHANCE, borde rojo, reloj en rojo | Batalla intensa |
| 14–15 | El camino y el jefe | Bosque, cueva, pantano y volcán en cortes rápidos, luego King Dread | Jefe |
| 16 | Victoria | PRINCESS RESCUED | Jingle de victoria |
| 17 | Derrota | GAME OVER (el remate cómico) | Jingle de derrota |
| 18–19 | Para la profe | Sin cuentas, sin ranking; cursos, unidades y dificultad | Batalla |
| 20 | Cierre | Logo de Purple Dino y la URL del juego | Golpe final |

## Lore usado

Del juego: King Dread es el rey de las sombras y custodia a la princesa enjaulada; hay cinco paradas
(Forest, The Cave, Swamp, Volcano, Castle Gate) con sus enemigos de sombra; al ganar, «the pack broke
the shadow curse».

Agregado para el tráiler (no aparece en el juego): que King Dread maldijo la tierra hace mucho y que
el arma contra las sombras es el inglés. Si no te convence, se cambia antes de grabar la voz.
