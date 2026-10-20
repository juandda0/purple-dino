# Auditoría — Purple Dino

**Iteración:** 3 · **Fecha:** 2026-10-18 · **Commit auditado:** `a623503` · **Modo:** arreglar (lote 11) + revisión adversarial

Este informe muestra solo lo que sigue abierto. Lo resuelto, descartado o fallido está en `historial.md`.

## Resumen

El usuario aprobó el Lote 11 en el chat y quedó aplicado en la rama `auditoria/2026-10-18` (nada subido ni mezclado): `ef161c3` (11.1–11.6), `567d564` (arreglos de la ronda 1 de la revisión adversarial) y `a623503` (sugerencias de la ronda 2). Verificado: typecheck, lint, 43 tests unitarios, 33 tests de reglas y build en verde, más pruebas en el navegador (offline, sala borrada, sala tomada, lobby). La revisión adversarial (2 rondas) terminó en APROBADO CON SUGERENCIAS; su único bloqueante (M1, lectura final desde la caché con enlace medio abierto) quedó resuelto. No queda ningún hallazgo CRÍTICO, ALTO ni MEDIO abierto; se abre el Lote 12 con tres detalles BAJO.

Otros cambios de esta corrida (pedidos por el usuario en el chat, no son lotes de auditoría): `ed36d35` el cronómetro de la batalla muestra solo los segundos en una caja con marco (se quitó el anillo de puntos y ya no se publican las imágenes del cronómetro); `a47c652` botón BACK en cada paso de crear partida y en la pantalla de unirse (solo si se abrió desde el inicio), y JOIN A GAME en la pantalla de inicio para que los alumnos jueguen desde un computador.

**Lo más grave que sigue abierto** (nada CRÍTICO, ALTO ni MEDIO):
- Lote 10: dependencias de desarrollo con avisos (BAJO).
- Lote 12: tres detalles de red y lobby (BAJO).
- Oportunidades A–N, en especial A (CI), B (App Check) y C (más tests del controlador).
- Preguntas de negocio abiertas: clases simultáneas y plan Blaze (la del alumno que se desconecta quedó resuelta: R11).
- Verificación manual de producción (proyecto Firebase real, API key, MFA, licencias, remoto privado).

| Severidad | Nuevos | Pendientes | Resueltos |
|---|---|---|---|
| CRÍTICO | 0 | 0 | 1 |
| ALTO | 0 | 0 | 5 |
| MEDIO | 1 | 0 | 27 |
| BAJO | 7 | 4 | 27 |
| Oportunidades AHORA | 0 | 4 | 0 |
| Oportunidades PRONTO / DESPUÉS | 0 | 10 | 0 |

Nuevos MEDIO: M1 de la revisión adversarial (hallado y resuelto en esta corrida). Los 11.1–11.4 MEDIO y los 11.5–11.6 BAJO pasaron a resueltos. Nuevos BAJO: 12.1–12.3 (pendientes) y B1–B4 de la ronda 1 (resueltos). Pendientes BAJO: Lote 10 y 12.1–12.3. Los resueltos de MEDIO/BAJO se reparten por lote porque las severidades por fila no se registraron.

### Resueltos en esta corrida

Detalle en `historial.md`.

| Lote | Commit |
|---|---|
| 11 Conexión inestable y sala que desaparece (11.1–11.6) | `ef161c3` |
| Revisión adversarial, ronda 1 (M1 y B1–B4) | `567d564` |
| Revisión adversarial, ronda 2 (sugerencias) | `a623503` |
| Otro: cronómetro solo con segundos (pedido del usuario) | `ed36d35` |
| Otro: BACK en cada paso y JOIN A GAME en el inicio (pedido del usuario) | `a47c652` |

## Preparación para producción

| Área | Estado | Por qué |
|---|---|---|
| Seguridad de la aplicación | a medias | Reglas validadas, votos ya no delatan la respuesta y una sala por profe (L3, L4 resueltos). Falta App Check (Op. B). |
| Ciberseguridad operativa y cadena de suministro | a medias | Build seguro, sourcemaps ocultos, CSP y fuentes locales (L5, L8 resueltos). Dependencias de desarrollo con avisos (L10); falta remoto privado (Op. D). Los tests de reglas ya no tocan las salas de desarrollo (11.5). |
| Privacidad y datos sensibles | a medias | Fuentes alojadas en el sitio (L8). Las salas abandonadas siguen sin borrarse solas (Op. E). |
| Escalabilidad | a medias | Lobby verificado con 40 alumnos (L1). Plan Spark = ~2 clases a la vez (pregunta abierta). |
| Confiabilidad y recuperación | a medias | Mejora con el Lote 11: ErrorBoundary y rondas íntegras (L3, L5); pregunta tardía con plazo completo (11.1); barrera de sincronización que evita perder vida sin red (11.3); el proyector se detiene si su sala desaparece (11.4). Quedan los detalles de 12.1 y la pestaña en segundo plano (Op. I). |
| Observabilidad | a medias | Banner "NO CONNECTION" tras 3 s sin red y aviso tras 3 escrituras rechazadas (11.2). Falta reporte de errores (Op. F). |
| Testing | a medias | 43 tests unitarios y 33 de reglas. El controlador ya tiene 8 tests con la capa de datos simulada (comprobados por mutación); falta ampliar (partida completa, dos partidas seguidas) en Op. C. |
| CI/CD | falta | Sin pipeline ni remoto (Op. A). |
| Documentación y contexto | a medias | Docs sincronizadas (L9). Falta `docs/operacion.md` (Op. G). |

**Veredicto:** todavía no lanzar a clases reales. Resolver primero las Oportunidades A, B y C y la verificación manual de abajo. Los lotes 1–9 cubrían lo bloqueante de la iteración 1 y el Lote 11 mejoró la confiabilidad con red inestable.

### Verificación manual (fuera del repositorio)

- [x] Crear el proyecto Firebase real (2026-10-18): `purple-dino-juandda0`, Auth anónima activada (Identity Platform), Realtime Database en `us-central1`, dominios `web.app`/`firebaseapp.com` autorizados. Desplegado en https://purple-dino-juandda0.web.app y probado de punta a punta.
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
  - R10 ("si nadie pudo responder no se pierde vida") se cumple también con la red de la profe caída o medio abierta (Lote 11).
  - R11 nueva (2026-10-18): quien se desconecta durante la pregunta sin responder no cuenta para esa pregunta.
  - El controlador tiene 9 tests con la capa de datos simulada; faltan partidas completas (Op. C).
- **Flujos críticos:**
  - F1–F4 verificados a mano; F1 con 40 alumnos simulados.
  - Sin tests automáticos de punta a punta.
- **Metas no funcionales:**
  - Cumplidas: 40 alumnos por sala, carga del celular, contraste.
  - En riesgo: retención de 24 h (Op. E); red lenta pero viva (12.1). Límite de R11: Firebase puede tardar ~1 min en notar un celular que perdió la señal de golpe.
  - Supuestas (sin confirmar): escala, plataformas y conectividad.
- **Fuera de alcance:** ningún desvío.

### Preguntas sobre requisitos

1. ¿Cuántas clases podrían jugar a la vez en el colegio? (el plan gratuito aguanta ~2).
2. ¿Pasar a plan Blaze para borrar las salas abandonadas a las 24 h y validar en el servidor?

Respondida el 2026-10-18: un alumno que se desconecta a mitad de pregunta sin responder **no cuenta** para esa pregunta (R11, aplicado en `docs/requisitos.md` y el controlador).

## Modelo de acceso

**Estado:** confirmado (2026-10-18) · **Archivo:** `docs/modelo-de-acceso.md`

- **Roles:** profe (host de su sala), alumno, visitante con sesión anónima.
- **Diferencias con el código:** 0 permiten más · 0 permiten menos · 0 sin cubrir por el modelo (L4 cerró los dos casos; la profe puede expulsar y hay una sala por profe).
- **Hallazgos pendientes de confirmar el modelo:** 0.

Sin preguntas abiertas; las respuestas del 2026-10-18 están en `historial.md` y `docs/modelo-de-acceso.md` ya recoge "la profe puede expulsar" y "una sala por profe".

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

Marca `[x]` en **Aprobar** para que se aplique (o apruébalo en el chat). Cada lote es un commit propio en la rama `auditoria/2026-10-18`, con sus tests, y se puede revertir solo. Los lotes 1–9 y 11 están resueltos (ver `historial.md`).

### Lote 10 — Dependencias de desarrollo · BAJO · no seguro · estado: pendiente (no aprobado)

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 10.1 | `package.json` | área 14 | firebase-tools 14 (tar crítico), vitest 3 (tinypool crítico), rules-unit-testing: solo afectan a la máquina de desarrollo, no al sitio. | Subir a firebase-tools 15, vitest 5 y la versión compatible de rules-unit-testing. | medio / medio |

### Lote 12 — Detalles de red y lobby · BAJO · no seguro · estado: pendiente

- [ ] Aprobar

| # | Ubicación | Regla (skill) | Problema | Arreglo | Esfuerzo / riesgo |
|---|---|---|---|---|---|
| 12.1 | `src/host/controller.ts` `finish()` | R10; revisión adversarial lote 11 | BAJO. Con red lenta pero viva (ida y vuelta > 10 s) la pregunta repetida se cuenta con lo que llegó y puede faltar alguna respuesta tardía. Compromiso documentado para no repetir sin fin. | Medir en el colegio; si pasa, subir `syncRepeatTimeoutMs` o avisar a la profe. | bajo / bajo |
| 12.2 | `src/host/screens/Lobby.tsx` | web-design-guidelines | BAJO. Con más de 49 entradas, los ocultos en "+N MORE" (desconectados, van al final) no se pueden quitar desde el lobby. | Lista desplazable o "quitar desconectados" en un clic. | bajo / bajo |
| 12.3 | `src/play/PlayApp.tsx` | modelo de acceso | BAJO (informativo). Un alumno quitado con la pestaña dormida vuelve a entrar solo al recargar. Aceptado: quitar no es vetar. | Ninguno salvo que se quiera vetar. | — |

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

### Oportunidad M — Quitar `react-router-dom` · rendimiento · DESPUÉS · hecho (2026-10-19)
- [x] Aprobar
- `src/lib/router.ts` (History API). Junto con `initializeAuth` sin resolver de popups: el chunk inicial pasó de 154 a 134 KB gz. React + Firebase van en un chunk `vendor` aparte, que sobrevive a los deploys del juego en la caché del celular.

### Oportunidad N — Estilos repetidos a clases · calidad · DESPUÉS · pendiente
- [ ] Aprobar

## Conflictos por decidir

- Ninguno. La duda sobre expulsar quedó resuelta (la profe puede expulsar; ver `historial.md`).

## A verificar

- Memoria y red en un portátil escolar de 4 GB con Wi-Fi real (música, L6 ya aplicado).
- Cuota de altas anónimas por IP de Firebase Auth con muchas clases tras la misma red del colegio.
- La CSP (L5.4) y los dominios regionales de Realtime Database contra el proyecto Firebase real, mirando violaciones en la consola.

## Lo que está bien y no hay que tocar

- La respuesta correcta nunca se escribe en la base (`question/answer` prohibido, `reveal.correct` solo con espadazo), con tests.
- Respuestas: una sola vez, solo en la ronda actual, con plazo y hora del servidor, y solo si el alumno entró antes de la pregunta; `joinedAt` lo pone el servidor y es inmutable.
- Salas no listables; respuestas y presencia solo para la profe; la raíz niega todo por defecto.
- Separación real proyector/celular: el celular baja ~0,3 MB y nunca el banco de preguntas ni el audio.
- Tabla de dificultad, mayoría estricta, reintento con otro orden y escudo, todo con tests; `finish` idempotente.
- Sprites con CSS `steps()` (≈3 % de CPU en el proyector durante una pregunta), respuestas con color + forma + texto, `safeStorage`, sin secretos en el repo.

## Revisión adversarial

### Iteración 3 (lote 11)

**Veredicto:** APROBADO CON SUGERENCIAS · **Rondas:** 2 · **Diff revisado:** `e5be0bb..ef161c3` (ronda 1) y `a47c652..567d564` (ronda 2)

| # | Tipo | Severidad | Evidencia | Qué se hizo |
|---|---|---|---|---|
| M1 | bloqueante (ronda 1) | MEDIO | Con enlace medio abierto (`.info/connected` sigue en true) la "lectura final" salía de la caché del SDK (hay un listener en la misma ruta) y la ronda podía costar una vida. | `567d564`: barrera de sincronización (escritura idempotente confirmada) antes de contar; sin confirmar → se repite una vez; sin red → nunca cuenta. Tests del controlador. |
| B1–B4 | sugerencias (ronda 1) | BAJO | Música en pánico tras extender el plazo; comentario del lobby; docs con "anillo de tiempo"; aviso "could not be saved" sobre "The room is gone". | Corregidas en `567d564`. |
| S1–S3 | sugerencias (ronda 2) | BAJO | Dos mutaciones sobrevivían a los tests; la repetición podía esperar más; `withTimeout` sin limpiar su timer. | `a623503`: tests ampliados (comprobados por mutación), espera de 10 s en la repetición, sin esperar la barrera sin red, timer limpiado. |
| N1 | nota | — | Solo se probaban las funciones puras. | `controller.test.ts` (9 tests con la capa de datos simulada). |

### Iteración 2 (lotes 1–9)

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
| Revisor adversarial lote 11, ronda 1 | Opus | delta de 2 commits (`e5be0bb..ef161c3`) | 6,7 min | 161 k |
| Revisor adversarial lote 11, ronda 2 | Opus | delta de 1 commit (`a47c652..567d564`) | 3,0 min | 95 k |
| Actualización del informe, iteración 3 | Sonnet | 3 | 1,9 min | 111 k |

## Verificación

- **Línea base:** typecheck ok, lint ok, tests ok (18), tests de reglas ok (22, con el emulador ya levantado), build ok.
- **Tras los arreglos de la iteración 2** (después de `d594d61`): 27 tests unitarios y 33 de reglas.
- **Tras los arreglos de la iteración 3** (después de `a623503`): typecheck ok, lint ok, 43 tests unitarios ok, 33 tests de reglas ok, build ok.
- **Tras R11** (alumno que se va sin responder no cuenta): 48 tests unitarios ok, 33 de reglas ok, build ok.
- **Navegador** (con el audio silenciado):
  - Una pregunta publicada sin conexión conservó su clave y tuvo 15 s desde la reconexión (ventana de 21,6 s).
  - Banner "NO CONNECTION" a los 3 s sin red.
  - Sin red durante toda una pregunta: no hay resultado, no se pierde vida y se repite la misma pregunta.
  - Rondas normales contadas (golpe 3/3).
  - Sala borrada a mitad de partida: "The room is gone" sin caída y sin más escrituras.
  - Código tomado por otra profe: el celular muestra "THE ROOM WAS CLOSED".
  - Lobby: × con confirmación que se cancela sola a los 3 s.
  - Los tests de reglas ya no vacían las salas de desarrollo.
  - Cronómetro nuevo; BACK en cada paso conserva la selección; JOIN A GAME abre la pantalla de unirse con BACK y sin BACK al abrir desde un QR.
