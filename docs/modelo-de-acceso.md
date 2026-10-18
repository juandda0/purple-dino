# Modelo de acceso — Purple Dino

**Estado:** confirmado en lo esencial (2026-10-18) · **Reglas:** [`database.rules.json`](../database.rules.json) · **Tests:** [`tests/rules/database.rules.test.ts`](../tests/rules/database.rules.test.ts)

No hay cuentas: todos entran con una **sesión anónima** de Firebase que el navegador recuerda. Los roles salen de la relación con la sala, no de un rol guardado.

## Roles

| Rol | Quién es | Cómo se asigna | Dónde vive en el código |
|---|---|---|---|
| Profe (host) | Quien creó la sala (una sala abierta por profe, C 2026-10-18) | Al crear la sala queda como `hostUid` y se anota en su índice | `rooms/{code}/hostUid`, `hostRooms/{uid}` |
| Alumno | Quien se unió a la sala | Al unirse se crea su entrada | `rooms/{code}/players/{uid}` |
| Visitante | Cualquiera con sesión anónima que conoce un código | — | `auth != null` |
| Anónimo sin sesión | Sin autenticar | — | — |

## Relaciones

| Relación | Entre | Cómo se guarda | Ciclo de vida |
|---|---|---|---|
| Dueña de la sala | Profe ↔ sala | `rooms/{code}/hostUid` + `hostRooms/{uid}` | Se crea con la sala (escritura atómica de ambos); la sala se borra al salir la profe. Una profe no puede abrir otra sala mientras la anterior exista (C). Si queda abandonada más de 24 h, otra persona puede reutilizar el código (su reloj de 24 h vuelve a empezar) o borrarla (C). |
| Alumno de la sala | Alumno ↔ sala | `rooms/{code}/players/{uid}` (+ `joinedAt` del servidor) | Entra en el lobby o a mitad de la batalla (C); no puede entrar a una partida terminada. `joinedAt` no se puede cambiar. |
| Conectado | Alumno ↔ sala | `presence/{code}/{uid}` con `onDisconnect` | Existe mientras la pestaña está abierta. |

## Matriz de permisos

| Recurso | Acción | Profe (host) | Alumno | Visitante | Sin sesión | Fuente |
|---|---|---|---|---|---|---|
| Sala (estado, pregunta pública, resultado) | leer | sí | sí | sí, si conoce el código | no | confirmada |
| | crear | sí, con un código libre o abandonado > 24 h, a su nombre y solo si no tiene otra sala abierta | — | igual que profe | no | confirmada |
| | editar (estado, pregunta, resultado, vidas) | sí | no | no | no | confirmada |
| | borrar | sí | no | solo si está abandonada > 24 h | no | confirmada |
| Lista de salas | leer | no | no | no | no | confirmada |
| Respuesta correcta | leer | solo en la memoria de su pantalla; **nunca se guarda en la base** | solo cuando hubo espadazo (`reveal.correct`) | igual que alumno | no | confirmada (R4) |
| Entrada de alumno | crear / editar | solo poner `ready` en falso al reiniciar; **no** puede renombrar, cambiar el dino ni inventar alumnos | solo la propia: nombre (1–16, sin caracteres de control), dino, listo; `joinedAt` = hora del servidor e inmutable | puede unirse a una sala en curso | no | confirmada |
| | borrar (expulsar) | sí, cualquier alumno de su sala | la propia (salir) | no | no | confirmada (2026-10-18) |
| Presencia | escribir | — | solo la propia y solo si es alumno de la sala | no | no | confirmada |
| | leer | sí | no | no | no | confirmada |
| Respuestas | escribir | — | una vez, solo la propia, solo en la ronda actual, antes del límite (+1,5 s) y si entró antes de que empezara la pregunta | no | no | confirmada (R2, R3) |
| | leer | todas las de su sala | solo la propia | no | no | confirmada |
| | borrar | las de su sala | no | solo si la sala no existe o está abandonada | no | confirmada |

## Campos sensibles

| Recurso | Campo | Quién puede verlo | Quién puede editarlo |
|---|---|---|---|
| Alumno | `name` (nombre de pila) | quien conozca el código de la sala | el propio alumno |
| Pregunta | respuesta correcta | nadie en la base (solo memoria del host) | nadie |

## Casos especiales

- Menores de edad: no se guardan datos reales más allá del nombre de pila durante la partida; no hay régimen especial (C).
- Riesgo aceptado: "una sala por profe" se aplica por sesión anónima; quien abra sesiones nuevas una y otra vez podría ocupar varios códigos. Frenarlo del todo requiere App Check o una Cloud Function (oportunidad B del informe de auditoría).
- Riesgo aceptado: los códigos son de 4 dígitos; alguien podría probar códigos y entrar a una sala ajena con un nombre falso (solo afecta a esa partida).
- En un fallo (escudo) solo se publica el porcentaje de aciertos: los votos por opción permitirían deducir la respuesta antes del reintento (R3/R4), así que solo se publican con espadazo.
- Riesgo aceptado: el banco de preguntas con respuestas viaja en el código del proyector (chunk separado que los celulares no descargan); un alumno técnico podría buscarlo. Mitigación futura: mover las respuestas a una Cloud Function.

## Preguntas abiertas

1. ~~¿La profe puede expulsar?~~ Sí (2026-10-18): las reglas lo permiten y el lobby tiene un botón × por alumno (al pasar el mouse); el alumno ve "YOU LEFT THE PACK" y puede volver a entrar.
