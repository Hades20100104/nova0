# Pipeline cognitivo — Parte 1

`/api/chat` conserva la autenticación, la comprobación de propietario de conversación, el modelo y los permisos por sección existentes.

## Ciclo de vida

1. **INTENT:** clasificación determinista `rules-v1` sin llamada adicional a IA: tipo de tarea, objetivo, dominios, necesidad de planificación, ejecución directa o aclaración, urgencia, capacidades candidatas y confianza heurística (no probabilidad calibrada). Los seguimientos cortos pueden recuperar el objetivo del mensaje previo.
2. **CONTEXT:** consulta paralela y acotada de datos reales con el cliente autenticado del usuario. Selecciona recuerdos por relevancia y preferencias generales; añade aprendizajes pertinentes, secciones activas y skills disponibles. Agenda/tareas/metas, automatizaciones, muestra financiera y estado de conexión Spotify solo se consultan cuando son relevantes. Las preferencias inmediatas se detectan en el mensaje actual, sin persistirlas como preferencias permanentes.
3. **PLANNER:** etapa explícitamente `deferred`; registra que un plan es necesario, sin simular un motor de planificación. El modelo conserva la capacidad actual de proponer planes.
4. **AGENT SELECTOR:** ejecuta el selector actual por sección después del contexto; no concede nuevos permisos ni deriva automáticamente a otros agentes.
5. **TOOLS / SKILLS:** conserva el bucle actual del modelo y herramientas. Los skills encontrados aportan contexto, no ejecución nueva. Registra nombres y estado de resultados, nunca argumentos ni contenido.
6. **VERIFICATION:** comprobación básica de resultados devueltos y errores; no es aún un verificador semántico independiente.
7. **MEMORY UPDATE:** contabiliza las operaciones `remember`/`learn_insight` del bucle existente; no introduce escrituras autónomas adicionales.
8. **RESPONSE:** guarda la respuesta y una parte `data-cognitive-trace` en la conversación del usuario. La respuesta continúa transmitiéndose como antes; las etapas finales observan el resultado del bucle, no retrasan cada fragmento hasta una verificación semántica.

## Trazabilidad y protección

- Cada solicitud tiene su propio identificador `X-Cognitive-Run-Id` y una traza aislada con tiempos, estados y resúmenes.
- Las respuestas guardadas incluyen la clasificación (sin duplicar el texto del objetivo), fuentes consultadas, secciones y skills relevantes. Se reutiliza la protección de las conversaciones existentes.
- Los errores y cancelaciones emiten trazas operativas sin texto del usuario, recuerdos, argumentos, resultados ni credenciales. Un fallo no se presenta como ejecución completada.
- Las fuentes que no responden se marcan `unavailable`; no se reemplazan por datos ficticios. El contexto nunca selecciona tokens de Spotify ni código de skills, y se delimita como datos no confiables.
- No se creó una tabla adicional: el intento de migración falló porque el servicio de datos no estaba accesible; el registro usa las partes JSON ya existentes, sin depender de esa migración.

## Validación

`bun test scripts/cognitive-pipeline.test.ts`: pruebas de clasificación, preferencias inmediatas, relevancia, consultas propietarias, ausencia de tokens, degradación, orden de las ocho etapas, fallos, cancelación y aislamiento.

La app abre sin errores de navegador y `/api/chat` rechaza con 401 una solicitud sin sesión. Falta verificar el flujo autenticado completo y la lectura de trazas guardadas: la obtención de sesión real falló por inaccesibilidad de Lovable Cloud.