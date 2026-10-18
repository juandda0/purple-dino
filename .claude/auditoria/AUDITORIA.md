# Auditoría — Purple Dino

**Iteración:** 2 · **Fecha:** 2026-10-18 · **Commit auditado:** `d594d61` · **Modo:** arreglar (lotes 1–9) + revisión adversarial

Este informe muestra solo lo que sigue abierto. Lo resuelto, descartado o fallido está en `historial.md`.

## Resumen

Los lotes 1–9 están aplicados en la rama `auditoria/2026-10-18` (un commit cada uno; nada subido ni mezclado) y verificados: typecheck, lint, 27 tests unitarios, 33 tests de reglas y build en verde, más pruebas en el navegador con 4 y 40 alumnos simulados. La revisión adversarial (2 rondas) rechazó el cambio; sus bloqueantes de la ronda 1 están cerrados y los dos de la ronda 2 se revirtieron. Con ellos y con hallazgos nuevos se abre el Lote 11.

**Lo más grave que sigue abierto:**
- Una pregunta que llega tarde a la base (profe sin red o con red lenta) deja a los alumnos con menos tiempo o sin él (11.1).
- No hay aviso visible cuando el portátil de la profe pierde la conexión (11.2).
- Un timeout al leer las respuestas puede costar una vida injustamente (11.3).
- Si se borra la sala a mitad de partida (segunda pestaña de la profe), el proyector se cae (11.4).

| Severidad | Nuevos | Pendientes | Resueltos |
|---|---|---|---|
| CRÍTICO | 0 | 0 | 1 |
| ALTO | 0 | 0 | 5 |
| MEDIO | 7 | 4 | 22 |
| BAJO | 2 | 3 | 21 |
| Oportunidades AHORA | 0 | 4 | 0 |
| Oportunidades PRONTO / DESPUÉS | 0 | 10 | 0 |

Nuevos MEDIO: 11.1–11.4 (pendientes) y 3 bloqueantes de la ronda 1 ya corregidos. Los resueltos de MEDIO/BAJO se reparten por lote porque las severidades por fila no se registraron; se asume que el Lote 10 era el único hallazgo BAJO pendiente de la iteración 1.

### Resueltos en esta corrida

Detalle en `historial.md`.

| Lote | Commit |
|---|---|
| 1 Lobby para 40 alumnos | `4784de9` |
| 2 Partidas repetidas | `379ef6b` |
| 3 Integridad de ronda | `98240b2` |
| 4 Reglas de seguridad | `69411f1` |
| 5 Despliegue seguro | `7e4dafa` |
| 6 Música más liviana | `ddeb671` |
| 7 Accesibilidad | `3529754` |
| 8 Créditos, assets y fuentes locales | `14d578a` + `df62356` |
| 9 Documentación | `35eb9e5` |
| Revisión adversarial, ronda 1 | `bc353fc` |
| Revisión adversarial, ronda 2 (revierte parte de `bc353fc`) | `d594d61` |

## Preparación para producción

| Área | Estado | Por qué |
|---|---|---|
| Seguridad de la aplicación | a medias | Reglas validadas, votos ya no delatan la respuesta y una sala por profe (L3, L4 resueltos). Falta App Check (Op. B). |
| Ciberseguridad operativa y cadena de suministro | a medias | Build seguro, sourcemaps ocultos, CSP y fuentes locales (L5, L8 resueltos). Dependencias de desarrollo con avisos (L10); falta remoto privado (Op. D); los tests de reglas borran el emulador de desarrollo (11.5). |
| Privacidad y datos sensibles | a medias | Fuentes alojadas en el sitio (L8). Las salas abandonadas siguen sin borrarse solas (Op. E). |
| Escalabilidad | a medias | Lobby verificado con 40 alumnos (L1). Plan Spark = ~2 clases a la vez (pregunta abierta). |
| Confiabilidad y recuperación | a medias | ErrorBoundary y rondas íntegras (L3, L5 resueltos). Preguntas tardías (11.1), timeout de lectura (11.3) y sala borrada a mitad de partida (11.4). |
| Observabilidad | falta | Sin aviso de conexión de la profe (11.2) ni reporte de errores (Op. F). |
| Testing | a medias | 27 tests unitarios y 33 de reglas. El controlador de la partida sigue sin tests (Op. C; 11.1 pide uno). |
| CI/CD | falta | Sin pipeline ni remoto (Op. A). |
| Documentación y contexto | a medias | Docs sincronizadas (L9). Falta `docs/operacion.md` (Op. G). |

**Veredicto:** todavía no lanzar a clases reales. Resolver primero el Lote 11 (11.1–11.4), las Oportunidades A, B y C y la verificación manual de abajo. Los lotes 1–9 cubrían lo bloqueante de la iteración 1.

### Verificación manual (fuera del repositorio)

- [ ] Crear el proyecto Firebase real: Auth anónima activada, Realtime Database (anotar la región), dominios autorizados.
- [ ] Restringir la API key web en Google Cloud Console al dominio de Hosting y a las APIs que usa.
- [ ] MFA en la cuenta Google dueña del proyecto Firebase.
- [ ] Si se pasa a Blaze: presupuesto con alertas 50/90/100 % y App Check en modo "enforce".
- [ ] Licencias: confirmar DinoCharacters, Pixel UI pack 3, Free Smoke Fx (guardar el texto en el repo); origen de Lamora; permiso de los autores de Landlord si el sitio será público; plan de Suno con el que se generaron las pistas.
- [ ] Remoto privado (GitHub/GitLab) con copia de `design/assets-src/`.
- [ ] Probar con una clase real: conexiones simultáneas y transferencia en la pestaña Usage de Firebase.

## Requisitos

**Estado:** borrador con puntos confirmados (2026-10-18) · **Archivo:** `docs/requisitos.md`

- **Reglas de negocio:**
  - R1–R9 se cumplen; los casos borde de R1/F3 (PLAY AGAIN) y R3/R4 (votos) están resueltos (L2, L3).
  - Abierto: con la red de la profe caída, la regla "si nadie pudo responder no se pierde vida" no se cumple (11.3).
  - El controlador sigue sin tests (Op. C).
- **Flujos críticos:**
  - F1–F4 verificados a mano; F1 con 40 alumnos simulados.
  - Sin tests automáticos de punta a punta.
- **Metas no funcionales:**
  - Cumplidas: 40 alumnos por sala, carga del celular, contraste.
  - En riesgo: retención de 24 h (Op. E), conexión inestable de la profe (11.1, 11.2).
  - Supuestas (sin confirmar): escala, plataformas y conectividad.
- **Fuera de alcance:** ningún desvío.

### Preguntas sobre requisitos

1. Un alumno que se **desconecta a mitad de pregunta** (pantalla bloqueada), ¿cuenta como fallo (hoy) o deja de contar en esa pregunta?
2. ¿Cuántas clases podrían jugar a la vez en el colegio? (el plan gratuito aguanta ~2).
3. ¿Pasar a plan Blaze para borrar las salas abandonadas a las 24 h y validar en el servidor?

## Modelo de acceso

**Estado:** confirmado (2026-10-18) · **Archivo:** `docs/modelo-de-acceso.md`

- **Roles:** profe (host de su sala), alumno, visitante con sesión anónima.
- **Diferencias con el código:** 0 permiten más · 0 permiten menos · 0 sin cubrir por el modelo (L4 cerró los dos casos; la profe puede expulsar y hay una sala por profe).
- **Hallazgos pendientes de confirmar el modelo:** 0.

Sin preguntas abiertas; las respuestas del 2026-10-18 están en `historial.md`. Comprobar que `docs/modelo-de-acceso.md` recoja "la profe puede expulsar" y "una sala por profe".

## Documentación y contexto

| Documento | Estado | Qué falta o dejó de ser cierto |
|---|---|---|
| `README.md` | al día | — |
| `CLAUDE.md` | al día | — |
| `.env.example` | al día | — |
| `GAME_DESIGN.md` | al día | — |
| `design/SUNO_PROMPTS.md` | al día | — |
| `design/assets/CREDITS.md` | al día | — |
| `docs/requisitos.md` | al día (borrador) | — |
| `docs/modelo-de-acceso.md` | al día | Anotar las decisiones del 2026-10-18 si faltan (ver arriba). |
| `docs/operacion.md` | falta | Deploy, rollback, qué hacer si Firebase cae (Op. G). |

**Actualizado en esta corrida:** README, CLAUDE.md, `.env.example`, GAME_DESIGN, SUNO_PROMPTS, CREDITS (lote 9, `35eb9e5`; nota de despliegue conjunto en `bc353fc`) · **Pendiente de aprobación:** ninguno.

## Stack y skills

- **Etapa actual:** prototipo jugable · **Objetivo:** producción (clases reales) · confirmado por el usuario
- **Contexto de riesgo:**
  - Datos sensibles: no; solo el nombre de pila de alumnos de 16–17 años, borrado al terminar. El negocio confirmó que no aplica un régimen especial.
  - No es multi-tenant, no cobra dinero.
  - Usuarios: profes y alumnos de una institución.
- **Stack:** React 19.3, Vite 7.3, TypeScript 5.9, Zustand 5, Firebase JS SDK 12.19 (RTDB + Auth anónima), Firebase Hosting, Vitest 3.2, ESLint 9.
- **Copia de trabajo:** carpeta principal (proyecto nuevo, sin trabajo de otros) · **Rama de arreglos:** `auditoria/2026-10-18` desde `main@4a62448`, con los lotes 1–9 y la revisión adversarial aplicados (sin push ni merge)

| Skill | Área | ¿Aplica? | Motivo |
|---|---|---|---|
| `vercel-react-best-practices` | cliente | sí | React 19 en todo el frontend |
| `vercel-composition-patterns` | cliente | sí | arquitectura de componentes |
| `web-design-guidelines` | UI / accesibilidad | sí | proyector y celular |
| `frontend-design` | UI | solo sugerencias | gusto visual, nunca hallazgo |
| `firebase-security-rules-auditor` | seguridad | parcial | escrito para Firestore/Storage; se aplicaron sus principios a RTDB |
| `firebase-auth-basics` | seguridad | sí | Auth anónima |
| `firebase-hosting-basics` | seguridad / operación | sí | `firebase.json`, cabeceras |
| `firebase-basics` | operación | sí | CLI, proyecto, emuladores |
| `engineering:testing-strategy` | testing | sí | qué probar del controlador |
| `engineering:documentation` | documentación | sí | inventario de docs |
| `firestore-rules-creation`, `firebase-firestore` | — | no | el proyecto usa Realtime Database |
| `firebase-app-hosting-basics` | — | no | SPA estática, sin SSR |
| `expo-*`, `react-native-*` | — | no | no es app móvil nativa |
| `elevenlabs-*`, `higgsfield-*`, `brightdata-*`, `zapier-*` | — | no | no son de revisión de código |

- **Áreas sin skill:** Realtime Database (reglas, modelado, presencia), auditada con conocimiento general y confianza menor.

### Herramientas corridas

Resultados de la línea base (iteración 1); no se repitieron en la iteración 2.

| Herramienta | Resultado | Log |
|---|---|---|
| Escáner de secretos | corrió (`git grep` de patrones de claves; gitleaks/trufflehog no instalados): 0 hallazgos | — |
| Auditor de dependencias | corrió (`npm audit`). Producción: 4 high, ninguno explotable (vienen de Firestore, que la app no incluye en el bundle). Desarrollo: 3 críticas y 8 high en firebase-tools 14, vitest 3 y rules-unit-testing. | `logs/npm-audit-summary.txt` |
| Lint y typecheck | 0 errores, 0 avisos (línea base) | `logs/verify.log` |
| Variables de entorno (código vs `.env.example`) | corrió: falta 1 (`VITE_EMULATOR_HOST`, opcional), sobran 0 | — |

### Skills recomendadas

Para instalarlas, pídelo en el chat (no basta con marcarlas aquí).

| Área | Skill | Fuente (último cambio) | Qué cubre / por qué esta | Riesgos | Cómo instalar |
|---|---|---|---|---|---|
| Testing | `vitest` | github.com/antfu/skills (2026-09-28), MIT, autor del core de Vite/Vitest | config, mocks, fake timers, entornos de Vitest; justo lo que piden los tests del controlador (Op. C) | ninguno encontrado (solo markdown) | copiar `skills/vitest` del clon revisado a `~/.claude/skills/vitest` |
| Realtime Database | ninguna confiable | firebase/agent-skills no tiene skill de RTDB; la única candidata (evanca/flutter-ai-rules) es para Flutter y no trae tests de reglas | — | — | — |

## Lotes

Marca `[x]` en **Aprobar** para que se aplique (o apruébalo en el chat). Cada lote es un commit propio en la rama `auditoria/2026-10-18`, con sus tests, y se puede revertir solo. Los lotes 1–9 están resueltos (ver arriba).

### Lote 10 — Dependencias de desarrollo · BAJO · no seguro · estado: pendiente (no aprobado)

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 10.1 | `package.json` | área 14 | firebase-tools 14 (tar crítico), vitest 3 (tinypool crítico), rules-unit-testing: solo afectan a la máquina de desarrollo, no al sitio. | Subir a firebase-tools 15, vitest 5 y la versión compatible de rules-unit-testing. | medio / medio |

### Lote 11 — Conexión inestable y sala que desaparece · MEDIO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 11.1 | `src/host/controller.ts` `publish()` | F3, R1; revisión adversarial ronda 2 | MEDIO. Una pregunta que llega tarde a la base (portátil sin red o con red lenta) deja a los alumnos con menos tiempo o sin él. El re-preguntar de `bc353fc` se revirtió: en red lenta sostenida entraba en bucle. | No re-preguntar: extender el plazo (`round.endsAt = serverNow() + duración`, escribir solo `question`/`endsAt`; la regla de respuestas ya lee `endsAt` de la base). Test unitario/del controlador. | medio / medio |
| 11.2 | `src/host/`, `src/data/` | observabilidad (área 7); revisión adversarial ronda 2 | MEDIO. Sin aviso cuando el portátil de la profe pierde la conexión: `update()` sin red se encola y no falla, así que el banner de `bc353fc` (revertido) nunca aparecía. | Banner con `onValue(ref(db, '.info/connected'))` desde `src/data/` (se muestra tras >3 s desconectado) más contador de escrituras rechazadas. | medio / bajo |
| 11.3 | `src/host/controller.ts` `finish` ~193-195 (ya existía) | R: "si nadie pudo responder no se pierde vida" | MEDIO. Si `readAnswers` final vence por tiempo (profe sin red), la ronda se decide solo con el snapshot en vivo y puede costar una vida. | `fetched === null` cuenta como "nadie": se repite sin castigo. Test. | bajo / bajo |
| 11.4 | `RoomScreen.tsx`, `src/host/controller.ts` | robustez | MEDIO. El proyector se cae (ErrorBoundary, "Cannot destructure 'difficulty' of room.config") si su sala se borra a mitad de partida mientras el controlador sigue escribiendo: la escritura optimista local recrea una sala parcial. Caso real: la profe crea sala en una segunda pestaña (una sala por profe borra la primera). Se descubrió porque los tests de reglas vaciaron el emulador de desarrollo. | `RoomScreen` trata una sala sin `config`/`hostUid` como cerrada; el controlador se destruye cuando `watchRoom` entrega `null`. Test. | bajo / bajo |
| 11.5 | `tests/rules/` | aislamiento de pruebas | BAJO. Usan el proyecto `demo-purple-dino` y `clearDatabase()`: correrlos contra el emulador de desarrollo (como sugieren README/CLAUDE.md con `dev:emu` activo) borra las salas vivas. | Otro `projectId` (por ejemplo `demo-purple-dino-rules`) para los tests de reglas. | bajo / nulo |
| 11.6 | `src/host/screens/Lobby.tsx`, `src/play/` | web-design-guidelines; revisión adversarial | BAJO. El botón × del lobby es invisible hasta el hover y no pide confirmación (difícil de descubrir en una pizarra táctil); los alumnos ocultos en "+N MORE" no se pueden quitar; un alumno expulsado con la pestaña dormida vuelve a entrar al recargar (aceptable: expulsar no es vetar); alumnos de una sala tomada por otra profe ven "YOU LEFT THE PACK" en vez de "THE ROOM WAS CLOSED". | × visible, confirmación, forma de quitar a los ocultos y mensaje distinto según el motivo. | bajo / bajo |

## Oportunidades

Nunca se aplican solas: marca `[x]` o pídelo en el chat.

**Áreas revisadas:**
- Aplican: seguridad, cadena de suministro, privacidad, escalabilidad, rendimiento, caché, confiabilidad, observabilidad, testing, CI/CD, costos, calidad, accesibilidad, dependencias, documentación.
- No aplican: SEO (solo un `noindex`); internacionalización, porque el producto es monolingüe; analítica, porque no hay métricas de producto en el alcance.

### Oportunidad A — CI mínimo (GitHub Actions) · CI/CD · AHORA · pendiente
- [ ] Aprobar
- **Problema:** nada impide integrar código roto; no hay remoto.
- **Solución:** workflow que corre `npm run verify` con Java 21 y los emuladores en cada push/PR; más adelante, previews de Hosting por PR. **Alternativa:** hook local de pre-push.
- **Costo:** gratis (2 000 min/mes en repo privado).
- **Beneficio:** los tests de reglas y lógica corren siempre.
- **Esfuerzo:** bajo · **Claude:** workflow y docs · **Tú:** crear el remoto privado.

### Oportunidad B — App Check + API key restringida · seguridad · AHORA · pendiente
- [ ] Aprobar
- **Problema:** scripts pueden recorrer salas y gastar cuota; el límite de una sala por profe (L4.5) frena la ocupación de códigos solo parcialmente.
- **Solución:** App Check con reCAPTCHA en RTDB y Auth (código listo, se activa con una clave en `.env`) + restringir la API key. **Alternativa:** solo el límite de una sala por sesión.
- **Costo:** gratis a esta escala.
- **Beneficio:** corta el abuso automatizado.
- **Esfuerzo:** medio · **Claude:** código y docs · **Tú:** registrar App Check y la clave en la consola.

### Oportunidad C — Tests del controlador de la partida · testing · AHORA · pendiente
- [ ] Aprobar
- **Problema:** F3 y R1–R3 viven en `controller.ts` sin tests.
- **Solución:** extraer la decisión de la ronda a una función pura y probar el controlador con temporizadores falsos.
  - Casos: idempotencia, quién cuenta, reintento sin `correct`, partida completa medium/hard, fallo de red sin perder vida, dos partidas seguidas.
  - **Alternativa:** Playwright con emulador y celulares simulados.
- **Costo:** sin dependencias nuevas.
- **Beneficio:** protege la mecánica central.
- **Esfuerzo:** medio.

### Oportunidad D — Repo privado y licencias en orden · cadena de suministro · AHORA · pendiente
- [ ] Aprobar
- **Problema:** todo vive en un portátil; `design/assets-src/` tiene archivos cuyas licencias prohíben redistribuirlos sueltos.
- **Solución:** remoto **privado**. Si algún día será público, sacar `assets-src/` del historial ahora, porque es barato con 4 commits.
- **Costo:** gratis.
- **Esfuerzo:** bajo · **Tú:** crear el remoto.

### Oportunidad E — Borrado automático a las 24 h · privacidad · PRONTO · pendiente
- [ ] Aprobar
- **Problema:** las salas abandonadas (pestaña cerrada sin salir) guardan nombres indefinidamente; requisito confirmado: borrar a las 24 h.
- **Solución:** función programada de Firebase (plan Blaze, céntimos al mes). **Alternativa en Spark:** un cron de GitHub Actions con una cuenta de servicio mínima.
- **Esfuerzo:** medio · **Tú:** decidir Blaze (pregunta 3).

### Oportunidad F — Errores y conexión visibles · observabilidad / confiabilidad · PRONTO · pendiente
- [ ] Aprobar
- **Problema:** "sala cerrada" y "error de red" se ven igual. Si la profe cierra la pestaña, los celulares quedan en una pregunta muerta. (El ErrorBoundary ya existe, L5; el banner de conexión de la profe es el 11.2.)
- **Solución:** mensajes distintos, timeout al crear la sala, presencia de la profe para avisar a los celulares. **Alternativa:** Sentry (plan gratis, carga diferida, sin datos personales).
- **Esfuerzo:** medio.

### Oportunidad G — `docs/operacion.md` · documentación · PRONTO · pendiente
- [ ] Aprobar
- Deploy, rollback (versiones de Hosting, reglas anteriores), qué mirar en la consola, qué hacer si Firebase cae. Esfuerzo bajo.

### Oportunidad H — `eslint-plugin-jsx-a11y` + prueba axe · accesibilidad · PRONTO · pendiente
- [ ] Aprobar
- El lint actual no detecta errores de ARIA. Plugin (bajo) y, después, axe con Playwright (medio).

### Oportunidad I — Pestaña del proyector en segundo plano · confiabilidad · DESPUÉS · pendiente
- [ ] Aprobar
- Chrome frena los temporizadores de pestañas ocultas; revisar plazos al volver (`visibilitychange`) o usar un Worker.

### Oportunidad J — Renovate/Dependabot + `npm audit` en CI · dependencias · DESPUÉS · pendiente
- [ ] Aprobar

### Oportunidad K — Códigos de 6 dígitos · seguridad · DESPUÉS · pendiente
- [ ] Aprobar
- 100× más difíciles de adivinar; costo: escribir 2 dígitos más.

### Oportunidad L — Validar respuestas en el servidor (Cloud Function) · seguridad · DESPUÉS · pendiente
- [ ] Aprobar
- Quita el banco de respuestas del cliente (riesgo aceptado hoy). Requiere Blaze. Esfuerzo alto.

### Oportunidad M — Quitar `react-router-dom` · rendimiento · DESPUÉS · pendiente
- [ ] Aprobar
- ~20 KB gz menos para el celular con 3 rutas simples.

### Oportunidad N — Estilos repetidos a clases · calidad · DESPUÉS · pendiente
- [ ] Aprobar

## Conflictos por decidir

- Ninguno. La duda sobre expulsar quedó resuelta (la profe puede expulsar; ver `historial.md`).

## A verificar

- Memoria y red en un portátil escolar de 4 GB con Wi-Fi real (música, L6 ya aplicado).
- Cuota de altas anónimas por IP de Firebase Auth con muchas clases tras la misma red del colegio.
- Qué cabecera de caché gana en el Hosting real (`/assets/**` vs `*.js`).
- La CSP (L5.4) y los dominios regionales de Realtime Database contra el proyecto Firebase real, mirando violaciones en la consola.

## Lo que está bien y no hay que tocar

- La respuesta correcta nunca se escribe en la base (`question/answer` prohibido, `reveal.correct` solo con espadazo), con tests.
- Respuestas: una sola vez, solo en la ronda actual, con plazo y hora del servidor, y solo si el alumno entró antes de la pregunta; `joinedAt` lo pone el servidor y es inmutable.
- Salas no listables; respuestas y presencia solo para la profe; la raíz niega todo por defecto.
- Separación real proyector/celular: el celular baja ~0,3 MB y nunca el banco de preguntas ni el audio.
- Tabla de dificultad, mayoría estricta, reintento con otro orden y escudo, todo con tests; `finish` idempotente.
- Sprites con CSS `steps()` (≈3 % de CPU en el proyector durante una pregunta), respuestas con color + forma + texto, `safeStorage`, sin secretos en el repo.

## Revisión adversarial

**Veredicto:** RECHAZADO (revertido parcialmente) · **Rondas:** 2 (máximo de la skill) · **Diff revisado:** `main..35eb9e5` (ronda 1) y `35eb9e5..bc353fc` (ronda 2) · bloqueantes cerrados o revertidos en `d594d61`

| # | Tipo | Severidad | Evidencia | Qué se hizo |
|---|---|---|---|---|
| R1a | bloqueante (ronda 1) | MEDIO | El índice `hostRooms` podía borrarse para saltarse "una sala por profe". | Corregido en `bc353fc`: las reglas usan el estado posterior a la escritura; test nuevo. |
| R1b | bloqueante (ronda 1) | MEDIO | El celular conservaba `picked` entre una pregunta y su repetición. | Corregido en `bc353fc`: `<Answer key={q.key}>`. |
| R1c | bloqueante (ronda 1) | MEDIO | Una pregunta publicada tarde con la profe sin red penalizaba a los alumnos. | Intento en `bc353fc` (re-preguntar) → falló en la ronda 2 (R2A). Pasó a 11.1. |
| R1d | sugerencias (ronda 1) | BAJO | Varias menores. | Aplicadas en `bc353fc`: gracia 2000 ms, `createdAt` se renueva al empezar, sonidos ligados a `revealKey`, CSP con dominios regionales de RTDB, nota en el README de desplegar juntos hosting y reglas. |
| R1e | hallazgo propio | MEDIO | En pruebas en el navegador, un `focus()` desplazaba el escenario de 1600 px hacia un lado y movía la batalla. | Corregido en `bc353fc` (`.stage-wrap { overflow: clip }`); `d594d61` añade el respaldo `overflow: hidden` para Safari antiguo. |
| R1f | confirmado por el usuario | — | Función "la profe quita a un alumno del lobby". | Implementada en `bc353fc` (botón ×; el celular muestra "YOU LEFT THE PACK" y puede volver a entrar). |
| R2A | bloqueante (ronda 2) | MEDIO | El re-preguntar de una pregunta tardía entra en bucle con red lenta sostenida: cada publicación confirmada >2 s tarde repite la pregunta cada ~2 s, descarta respuestas y `questionNumber` sube hasta el límite de 1000 de las reglas. | Parte revertida en `d594d61` (la skill limita a 2 rondas), marcada "falló". Pasó a 11.1. |
| R2B | bloqueante (ronda 2) | MEDIO | El banner solo contaba escrituras rechazadas, pero un `update()` sin red se encola en vez de fallar: no aparece con el Wi-Fi caído. | Parte revertida en `d594d61`, marcada "falló". Pasó a 11.2. |
| R2C | sugerencia (revisión ronda 1) | BAJO | × invisible hasta hover, sin confirmación, alumnos ocultos sin acceso, reingreso por recarga, mensaje de sala tomada. | Al informe para la siguiente versión: 11.6. |

## Ejecución

| Subagente (temas) | Modelo | Archivos recibidos | Duración | Tokens |
|---|---|---|---|---|
| Seguridad: reglas, auth, datos, hosting, dependencias | Opus (sesión) | ~11 | 6,3 min | 120 k |
| Lógica: reglas de negocio, controlador, celular, banco, tests | Opus (sesión) | ~20 | 4,6 min | 134 k |
| Cliente: React, UI, accesibilidad, rendimiento | Sonnet | ~25 | 14,9 min | 229 k |
| Documentación y operación: docs, CI, costos, higiene | Sonnet | ~18 | 5,5 min | 158 k |
| Revisor adversarial, ronda 1 | Opus | diff completo (`main..35eb9e5`) | — | — |
| Revisor adversarial, ronda 2 | Opus | delta de 1 commit (`35eb9e5..bc353fc`) | 3,8 min | 113 k |
| Actualización del informe (AUDITORIA.md, estado.json, historial.md) | Sonnet | 3 | — | — |

## Verificación

- **Línea base:** typecheck ok, lint ok, tests ok (18), tests de reglas ok (22, con el emulador ya levantado), build ok.
- **Tras los arreglos** (después de `d594d61`): typecheck ok, lint ok, 27 tests unitarios ok, 33 tests de reglas ok (contra el emulador ya levantado), build ok.
- **Navegador** (con el audio silenciado): partida completa con 40 alumnos simulados (antes de la ronda 1); con 4 alumnos: espadazo, escudo con reintento, game over, PLAY AGAIN reinicia "ready", la profe quita a un alumno (el celular muestra YOU LEFT THE PACK y JOIN AGAIN funciona) y diseño a pantalla completa sin desplazamiento lateral; celular a 320×600.
