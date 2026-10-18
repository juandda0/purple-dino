# Modelo de acceso — Purple Dino

**Estado:** confirmado en lo esencial (2026-10-18) · **Reglas:** [`database.rules.json`](../database.rules.json) · **Tests:** [`tests/rules/database.rules.test.ts`](../tests/rules/database.rules.test.ts)

No hay cuentas: todos entran con una **sesión anónima** de Firebase que el navegador recuerda. Los roles salen de la relación con la sala, no de un rol guardado.

## Roles

| Rol | Quién es | Cómo se asigna | Dónde vive en el código |
|---|---|---|---|
| Profe (host) | Quien creó la sala | Al crear la sala queda como `hostUid` | `rooms/{code}/hostUid` |
| Alumno | Quien se unió a la sala | Al unirse se crea su entrada | `rooms/{code}/players/{uid}` |
| Visitante | Cualquiera con sesión anónima que conoce un código | — | `auth != null` |
| Anónimo sin sesión | Sin autenticar | — | — |

## Relaciones

| Relación | Entre | Cómo se guarda | Ciclo de vida |
|---|---|---|---|
| Dueña de la sala | Profe ↔ sala | `rooms/{code}/hostUid` | Se crea con la sala; la sala se borra al salir la profe. Si queda abandonada más de 24 h, otra persona puede reutilizar el código o borrarla (C). |
| Alumno de la sala | Alumno ↔ sala | `rooms/{code}/players/{uid}` (+ `joinedAt` del servidor) | Entra en el lobby o a mitad de la batalla (C); no puede entrar a una partida terminada. `joinedAt` no se puede cambiar. |
| Conectado | Alumno ↔ sala | `presence/{code}/{uid}` con `onDisconnect` | Existe mientras la pestaña está abierta. |

## Matriz de permisos

| Recurso | Acción | Profe (host) | Alumno | Visitante | Sin sesión | Fuente |
|---|---|---|---|---|---|---|
| Sala (estado, pregunta pública, resultado) | leer | sí | sí | sí, si conoce el código | no | confirmada |
| | crear | sí, con un código libre o abandonado > 24 h, a su nombre | — | igual que profe | no | confirmada |
| | editar (estado, pregunta, resultado, vidas) | sí | no | no | no | confirmada |
| | borrar | sí | no | solo si está abandonada > 24 h | no | confirmada |
| Lista de salas | leer | no | no | no | no | confirmada |
| Respuesta correcta | leer | solo en la memoria de su pantalla; **nunca se guarda en la base** | solo cuando hubo espadazo (`reveal.correct`) | igual que alumno | no | confirmada (R4) |
| Entrada de alumno | crear / editar | puede editar `ready` al reiniciar | solo la propia: nombre (1–16), dino, listo; `joinedAt` = hora del servidor e inmutable | puede unirse a una sala en curso | no | confirmada |
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
- Riesgo aceptado: los códigos son de 4 dígitos; alguien podría probar códigos y entrar a una sala ajena con un nombre falso (solo afecta a esa partida).
- Riesgo aceptado: el banco de preguntas con respuestas viaja en el código del proyector (chunk separado que los celulares no descargan); un alumno técnico podría buscarlo. Mitigación futura: mover las respuestas a una Cloud Function.

## Preguntas abiertas

1. ¿La profe debería poder expulsar a un alumno (nombre inapropiado)? Hoy no puede.
