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
- Pregunta de negocio abierta: alumno que se desconecta a mitad de pregunta.
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

### Verificación

- **Línea base:** typecheck ok, lint ok, tests ok (18), tests de reglas ok (22, con el emulador ya levantado), build ok.
- **Tras los arreglos de la iteración 2** (después de `d594d61`): 27 tests unitarios y 33 de reglas.
- **Tras los arreglos de la iteración 3** (después de `a623503`): typecheck ok, lint ok, 43 tests unitarios ok, 33 tests de reglas ok, build ok.
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
