# Requisitos — Purple Dino

**Estado:** borrador con puntos confirmados (2026-10-18) · **Última revisión:** 2026-10-18
Cada punto: (C) confirmado por el negocio · (S) supuesto, pendiente de confirmar.
Diseño completo del juego: [GAME_DESIGN.md](../GAME_DESIGN.md). Permisos: [modelo de acceso](modelo-de-acceso.md).

## Propósito y usuarios

Quiz cooperativo de inglés para la clase (tipo Kahoot) en el que toda la clase es un dinosaurio morado que pelea contra dinosaurios de sombra. Repasa las unidades de *Passages 3rd Edition* (Course 6) sin ranking individual. Se usará en **clases reales** (C).

| Tipo de usuario | Qué necesita lograr |
|---|---|
| Profe (pantalla del proyector) | Crear una partida en segundos, sin cuenta (C), elegir curso, unidades y dificultad, y conducir la batalla. |
| Alumno de 16–17 años (celular) | Entrar con el QR o un código de 4 dígitos y su nombre de pila, marcar "listo" y responder desde el celular. |

## Flujos críticos

### F1 — Crear partida y lobby (C)
- Dado que la profe abre la página, cuando elige Course 6, al menos una unidad y una dificultad, entonces se crea una sala con un código de 4 dígitos libre y un QR que lleva a `/join/<código>`.
- START solo se habilita cuando hay al menos un alumno conectado y todos los conectados están listos.

### F2 — Unirse (C)
- Dado un código válido y un nombre de pila (1–16 caracteres), cuando el alumno toca JOIN, entonces aparece en el lobby con su dino.
- Un alumno puede entrar con la batalla empezada; participa **desde la siguiente pregunta** (C).
- Si recarga la página, vuelve a la misma sala con la misma identidad (S).

### F3 — Ronda de pregunta (C)
- Cada pregunta tiene 4 opciones y un tiempo según la dificultad (30 / 20 / 15 s).
- Cada alumno responde una sola vez y su respuesta queda bloqueada.
- Al acabarse el tiempo o cuando respondieron todos, se resuelve la ronda.

### F4 — Fin de partida (C)
- Victoria al derrotar a King Dread; derrota al fallar sin escudo.
- Al salir de la partida, los datos de la sala se borran (C).

## Reglas de negocio

| # | Regla | Por qué importa | (C/S) |
|---|---|---|---|
| R1 | Espadazo si **más del 50%** de los alumnos que cuentan acierta; quien no responde cuenta como fallo. | Es la mecánica central. | C |
| R2 | Cuentan los alumnos **conectados** que entraron **antes** de que empezara la pregunta. | Quien entra tarde no debe hundir ni salvar una pregunta que no vio entera. | C |
| R3 | Si la mayoría falla, **no se revela la respuesta correcta** y se repite **la misma pregunta con las opciones en otro orden**. | Que el reintento no sea regalado. | C |
| R4 | Los celulares **nunca reciben la respuesta correcta** antes del espadazo. | Evitar trampas. | C |
| R5 | Vidas por dificultad: Easy 5, Medium 3, Hard 2; el último fallo se juega sin escudo ("LAST CHANCE"). | Ajusta cuánto perdona el juego. | C |
| R6 | Vida de enemigos 1 / 2 / 3 y del jefe 2 / 3 / 4 → 6 / 11 / 16 preguntas para ganar sin fallos. | Duración de la partida. | C |
| R7 | En una partida no se repite una pregunta (salvo el reintento por fallo). | Variedad. | C |
| R8 | Sin ranking público: el celular muestra solo el aporte propio. | Cooperativo. | C |
| R9 | Solo se guarda el **nombre de pila** del alumno; no se guarda historial. | Privacidad (no hay datos reales sensibles). | C |
| R10 | Si **nadie** puede responder una pregunta (nadie conectado, p. ej. se cae el Wi-Fi), no se quita vida: se repite la misma pregunta. | No castigar a la clase por la red. | C (2026-10-18) |
| R11 | Un alumno que **se desconecta durante la pregunta sin haber respondido** deja de contar para esa pregunta (ni en el total ni como fallo); una respuesta ya enviada siempre cuenta. Si eran los únicos que faltaban, la pregunta se cierra antes. Ej.: 10 alumnos, 1 se va sin responder, 5 aciertan → 5 de 9, espadazo. Exactamente 50 % sigue siendo fallo (mayoría estricta). | Que una red inestable no hunda a la clase. Límite: Firebase puede tardar hasta ~1 min en notar un celular que perdió la señal de golpe; mientras tanto ese alumno sigue contando. | C (2026-10-18) |

## Requisitos no funcionales

| Área | Meta medible | (C/S) |
|---|---|---|
| Escala | Hasta 40 alumnos por sala; pocas salas simultáneas (una institución). En el plan gratuito de Firebase el límite es 100 conexiones simultáneas a la base de datos. | S |
| Rendimiento | Una respuesta se refleja en el proyector en < 1 s con Wi-Fi escolar; la app del celular carga en < 3 s en 4G. | S |
| Disponibilidad | Una caída durante una clase se tolera reiniciando la partida; no se guardan datos que perder. | S |
| Seguridad | Reglas de base de datos que hacen cumplir R2, R4 y el modelo de acceso, con tests en el emulador. | C |
| Privacidad y datos | Nombre de pila y respuestas viven solo mientras dura la partida; se borran al salir. Salas abandonadas: borrar a las 24 h (C) — hoy solo se pueden reutilizar a las 24 h, el borrado automático necesita una función programada (plan Blaze). | C |
| Accesibilidad | Respuestas con color + forma + texto; texto grande legible en proyector; contraste AA en la interfaz (S). | C/S |
| Plataformas | Proyector: Chrome/Edge actuales. Celulares: Safari iOS 16+ y Chrome Android de los últimos 2 años. | S |
| Conectividad | Funciona con Wi-Fi escolar; si un celular se desconecta, deja de contar hasta que vuelve (R11). Si el proyector pierde la red: aviso visible tras 3 s; la pregunta que llegó tarde recupera su tiempo completo, y una ronda que no se pudo contar (sin red, o con una red que parece conectada pero no deja pasar nada) se repite sin quitar vida (R10); si la red parece conectada, solo una vez por pregunta, para que una red lenta no deje a la clase repitiendo sin fin. | S |
| Idiomas | Toda la interfaz del juego en inglés; la documentación interna en español. | C |

## Fuera de alcance (v1)

- Cuentas de profe, editor de preguntas, otros cursos (solo "Coming soon").
- Estadísticas guardadas entre partidas, ranking individual.
- Power-ups, preguntas con audio.
- Reanudar una batalla si la profe recarga la página (hoy vuelve al lobby).

## Preguntas abiertas

1. ¿Cuántas clases podrían jugar a la vez en el colegio? (define si basta el plan gratuito).
2. ¿Pasar a plan Blaze para borrar salas abandonadas a las 24 h automáticamente?
3. ¿Qué navegadores y celulares tienen realmente los alumnos?
