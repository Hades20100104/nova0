# Modo agente auto-extensible para Nova

Convertir el chat de Nova en un agente que, cuando le pides algo para lo que no tiene una herramienta hecha, **razone, busque en la web y/o genere y ejecute código JavaScript en una sandbox aislada**, y guarde las soluciones útiles como "skills" reutilizables.

## Cómo funciona, en una frase

El modelo recibe la conversación + un catálogo de herramientas. Si ninguna herramienta encaja, llama a la herramienta especial `run_code` que ejecuta JS efímero en un sandbox sin acceso a tus datos. Si la solución funciona y es reutilizable, llama a `save_skill` para guardarla y tenerla disponible la próxima vez.

## Componentes

### 1. Sandbox de ejecución (cómputo aislado, server-side)
- Server function `runSandbox.functions.ts` que ejecuta JS en `quickjs-emscripten` (intérprete WASM, totalmente aislado, sin `fetch`/`process`/`require`).
- Permitido: `Math`, `JSON`, `Date`, `String`, `Array`, regex, parseo, cálculos.
- Permitido bajo allowlist explícita: `fetch` solo a APIs HTTPS públicas (sin cookies, sin headers de auth). Se filtra por dominio y se aplica timeout de 5s y límite de respuesta de 100KB.
- Bloqueado: filesystem, env vars, BD, secretos, contactos, memoria, automatizaciones del usuario.
- Timeout duro: 3s de CPU, 10MB RAM.
- Devuelve `{ ok, result, logs, error }`.

### 2. Router de modelos (Nova elige según la tarea)
- `src/lib/model-router.ts`: clasificador rápido con `gemini-3-flash-preview` que decide:
  - **Flash** → conversación normal, respuestas cortas, traducciones.
  - **GPT-5** → tareas con razonamiento, código, multi-paso, matemáticas.
- Se ejecuta una sola vez por turno antes del modelo principal.

### 3. Catálogo de herramientas para el agente
El chat pasa al modelo este conjunto de tools (function calling):
- `web_search(query)` → busca en la web (proxy server-side).
- `run_code(description, code)` → ejecuta JS en el sandbox.
- `save_skill(name, description, code, params_schema)` → guarda un skill nuevo.
- + las herramientas existentes (memoria, automatizaciones, WhatsApp, Spotify…).
- Los skills guardados aparecen como tools dinámicas en el siguiente turno.

### 4. Skills persistentes
Tabla `agent_skills` con: `id`, `user_id`, `name`, `description`, `code`, `params_schema` (JSON), `usage_count`, `last_used_at`, `enabled`.
RLS: cada usuario solo ve los suyos. Cuando se cargan las tools del agente, se inyectan los skills habilitados del usuario.

### 5. UI mínima
- En el chat, cuando el agente usa `run_code` o `save_skill` se muestra un "chip" colapsable con el nombre de la acción (no el código completo, para no ensuciar el hilo).
- Nueva sección en `Settings` → "Habilidades aprendidas" para listar, deshabilitar o borrar skills.

## Flujo de un turno

```text
usuario: "calcula la propina del 18% sobre 47.50 y conviértela a USD"
   ↓
router → GPT-5 (tarea de cálculo)
   ↓
modelo: no tengo tool para esto → llama run_code({ code: "..." })
   ↓
sandbox ejecuta → { ok: true, result: 9.39 EUR ≈ 10.20 USD }
   ↓
modelo: llama save_skill({ name: "tip_calculator", ... })
   ↓
modelo responde al usuario con el resultado
```

## Detalles técnicos

- **Dependencia nueva**: `quickjs-emscripten` (~300KB, WASM, compatible con Cloudflare Workers).
- **Server functions nuevas**: `runSandbox`, `webSearch`, `saveSkill`, `listSkills`, `deleteSkill`.
- **Migración**: tabla `agent_skills` con RLS por `user_id`.
- **Modificaciones**: `src/server/chat.functions.ts` para el loop de tool-calling (hasta 5 iteraciones por turno, anti-loop).
- **Modelos**: Flash por defecto, GPT-5 cuando el router lo decide o cuando el modelo pide razonamiento profundo.
- **Coste/seguridad**: cada `run_code` y `save_skill` se loguea por usuario; tope de 50 ejecuciones/día por usuario para evitar abuso.

## Lo que NO incluye este plan

- No modifica el código fuente de Nova en runtime (imposible en Workers).
- No instala paquetes npm dinámicamente.
- El sandbox no accede a tu memoria/contactos/automatizaciones (lo confirmaste: "solo cómputo aislado").

## Archivos a crear/modificar

**Crear**
- `src/server/sandbox.functions.ts` (ejecuta JS en QuickJS)
- `src/server/skills.functions.ts` (CRUD de skills)
- `src/server/web-search.functions.ts` (proxy de búsqueda)
- `src/lib/model-router.ts` (decide Flash vs GPT-5)
- `src/lib/agent-tools.ts` (catálogo de tools + loop)
- `src/components/AgentActionChip.tsx` (chip colapsable en chat)
- `src/components/SkillsManager.tsx` (UI en settings)
- Migración: tabla `agent_skills`

**Modificar**
- `src/server/chat.functions.ts` (loop de tool-calling)
- `src/components/SettingsDrawer.tsx` (entrada a SkillsManager)
- `src/components/ChatBubble.tsx` (renderizar AgentActionChip)
