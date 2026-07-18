# Auto-creación de secciones NOVA/NEVIRA

La app podrá crear sus propias secciones bajo demanda (comando del usuario en el chat) o por propuesta de la IA cuando detecte un patrón. Cada sección se compone de bloques (widgets) definidos por JSON y puede invocar skills ejecutables en el sandbox QuickJS que ya existe (`agent_skills`). Todo es por usuario.

## Modelo de datos

Dos tablas nuevas + reutilizamos `agent_skills`:

```text
user_sections
├─ id uuid pk
├─ user_id uuid  ← auth.uid()
├─ assistant   'nova' | 'nevira'
├─ slug        text  (unique por user_id, kebab-case)
├─ label       text
├─ icon        text  (lucide id o emoji)
├─ accent      text  (hsl var o hex)
├─ layout      jsonb ← array de bloques (ver contrato)
├─ created_by  'user' | 'ai'
├─ status      'active' | 'archived'
└─ timestamps

section_events (opcional, para "la IA propone")
├─ id, user_id, kind (suggest|used|dismissed), payload jsonb, created_at
```

RLS: SELECT/INSERT/UPDATE/DELETE `WHERE user_id = auth.uid()`. GRANT a `authenticated` y `service_role`.

## Contrato de layout (JSON)

Un bloque = uno de los tipos ya soportados por la app, para no ejecutar código arbitrario en el front:

```json
{
  "blocks": [
    { "type": "stat",        "title": "Docs", "source": "count:generated_documents" },
    { "type": "list",        "title": "Últimas imágenes", "source": "query:images.recent", "limit": 6 },
    { "type": "chart",       "title": "Actividad", "source": "query:messages.by_day", "range": 30 },
    { "type": "action",      "title": "Resumir semana", "skill": "weekly_recap", "input": {} },
    { "type": "chat_prompt", "title": "Pregúntame", "seed": "Analiza mis últimas notas" },
    { "type": "markdown",    "content": "Notas rápidas..." }
  ]
}
```

Los `source` son un whitelist cerrado (`count:<table>`, `query:<preset>`) resuelto en `src/lib/section-sources.ts`. La IA nunca escribe SQL libre.

## Skills ejecutables (extiende lo que ya existe)

`agent_skills` ya guarda código JS que corre en `sandbox.functions.ts` (QuickJS, 3s). Añadimos:

- Campo `section_slug` (nullable) para asociar un skill a una sección.
- Herramientas nuevas en `chat-tools.ts`:
  - `create_section({ label, icon, accent, layout, assistant })` → inserta en `user_sections`.
  - `update_section({ slug, patch })`.
  - `attach_skill({ section_slug, name, description, code })` → guarda en `agent_skills` con validación.
  - `run_skill({ name, input })` → ya existe vía sandbox.
- Cuando un bloque `action` se pulsa, se invoca `run_skill` con el input configurado y el resultado se renderiza (texto / json / imagen).

## Flujo "el usuario lo pide"

1. Usuario en el chat: *"crea una sección para trackear mis hábitos".*
2. El modelo planifica y llama `create_section` con un layout inicial + un skill opcional (`attach_skill`).
3. La sección aparece inmediatamente en el sidebar (React Query invalida el listado).
4. El usuario puede pulsar acciones → corren en sandbox.

## Flujo "la IA lo propone"

Un hook ligero `useSectionSuggestions` mira contadores (docs, imágenes, memoria) cada N min y, si supera umbrales, dispara una server fn `proposeSection` que pide al modelo un layout candidato y lo guarda como `section_events(kind='suggest')`. Aparece un toast/chip en el home ofreciendo *"Crear sección: Diario de fotos"* → confirma → `create_section`.

## Sidebar y rutas

- Rutas dinámicas ya existentes por assistant. Añadir `src/routes/_authenticated/nova.section.$slug.tsx` (y equivalente Nevira) que:
  1. Carga la sección con `requireSupabaseAuth` por slug.
  2. Renderiza `<DynamicSection layout=... />` con los bloques whitelisted.
- `ModuleSidebar` mezcla módulos estáticos + `user_sections` del usuario.

## Seguridad

- Todo el código de skills corre en QuickJS aislado (ya existe), sin `fetch`/`import` fuera de las tools expuestas.
- Los `source` de bloques son enumerados; la IA no puede inyectar SQL ni URLs.
- Un skill nuevo requiere confirmación del usuario la primera vez (chip "Ejecutar" en el chat, no auto-run).

## Ficheros a tocar

Nuevos:
- `supabase/migrations/*_user_sections.sql` (tablas + RLS + GRANT + campo en `agent_skills`).
- `src/lib/sections.functions.ts` (CRUD + `proposeSection`).
- `src/lib/section-sources.ts` (resolver whitelisted).
- `src/components/dynamic/DynamicSection.tsx` + bloques (`StatBlock`, `ListBlock`, `ChartBlock`, `ActionBlock`, `ChatPromptBlock`, `MarkdownBlock`).
- `src/routes/_authenticated/nova.section.$slug.tsx` y `nevira.section.$slug.tsx`.
- `src/hooks/use-section-suggestions.ts`.

Editados:
- `src/lib/chat-tools.ts` → añadir `create_section`, `update_section`, `attach_skill`.
- `src/components/dashboard/ModuleSidebar.tsx` → mezclar secciones dinámicas + menú "＋ Nueva sección".
- `src/components/SkillsManager.tsx` → mostrar skills vinculados a secciones.

## No incluido (para acotar)

- Generación de `.tsx` reales (requiere rebuild).
- Compartir secciones entre usuarios.
- Marketplace / import-export.

¿Aprueba este alcance para implementarlo?
