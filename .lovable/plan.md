## 1) Comunicación interna estilo WhatsApp (1‑a‑1 + grupos + IA compartida)

**DB (una sola migración):**
- `chat_rooms` (id, kind: 'dm'|'group', name, avatar_url, created_by, ai_enabled bool, ai_assistant enum('nova','nevira'))
- `chat_members` (room_id, user_id, role: 'owner'|'member', joined_at) — PK compuesta
- `chat_room_messages` (id, room_id, sender_id nullable, sender_kind: 'user'|'ai', body, attachments jsonb, created_at)
- `profiles`: añadir `username` único (búsqueda por @).
- RLS: solo miembros ven mensajes/room; INSERT si eres miembro; INSERT en members solo owner. GRANTs correctos.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_messages, chat_members, chat_rooms`.

**Server fns (`src/lib/rooms.functions.ts`):** `searchUsers`, `createRoom` (dm/group), `listMyRooms`, `getRoom`, `addMember`, `leaveRoom`, `sendRoomMessage`, `invokeAiInRoom` (si `ai_enabled`, corre chat con contexto del room y publica como `sender_kind='ai'`).

**UI:** nueva sección `comunicacion` con:
- Sidebar de rooms + botón "Nuevo" (buscar @username, crear DM o grupo).
- Panel de conversación (burbujas, adjuntos ya soportados por bucket `chat-attachments`, realtime subscribe).
- Toggle "Incluir IA (NOVA/NEVIRA)" en el room → mencionar con `@nova` invoca `invokeAiInRoom`.

## 2) Análisis IA del mundo (Web + X/Reddit)

**Tools nuevas en `chat-tools.ts` (contextuales a la sección `analisis-ia`):**
- `analyze_trends({ topic, region?, timeframe? })`: combina `web_search` (DuckDuckGo ya integrado) + gateway X (`/2/tweets/search/recent`) + Reddit JSON (`https://www.reddit.com/search.json`, sin auth para lectura). Devuelve resumen + fuentes + sentimiento aproximado.
- `analyze_person({ name })`: mismo pipeline enfocado en menciones/bio pública. Nunca datos privados.
- `analyze_topic_report({ topic })`: llama a las dos + LLM para redactar informe estructurado.

**Conector X:** requiere que el usuario conecte X (api_key). Si no está conectado, la tool devuelve un aviso amable con acción "Conectar X".

**UI:** la sección `analisis-ia` gana un panel dedicado (input de tópico/persona, timeframe, chips de resultados con fuentes clicables, chart de menciones por día).

## 3) Identidad real por sección (las 3 opciones combinadas)

**Modelo nuevo `src/lib/section-agents.ts`:**
```ts
type SectionAgent = {
  slug: string;            // 'imagenes', 'documentos', ...
  name: string;            // 'Lumen', 'Codex', 'Aria', 'Atlas', 'Echo'...
  voice: 'jarvis'|'natural'|'warm'|'crisp';
  systemPrompt: string;    // rol + límites
  allowedTools: string[];  // whitelist de tools por sección
  forbiddenTools?: string[];
  ui: 'gallery'|'editor'|'chat'|'map'|'dashboard';
};
```

**Enforcement en chat:**
- `chat.functions.ts` acepta `sectionSlug`. Antes de exponer tools al modelo filtra por `allowedTools`.
- Si el usuario pide algo fuera de contexto ("genera una imagen" en Documentos), el sistema responde con sugerencia de cambiar de sección + botón de redirección (no ejecuta).

**Sub‑agentes por sección (propuesta inicial):**
- Imágenes → **Lumen** (voz warm, tools: `generate_image`, `edit_image`).
- Documentos → **Atlas** (crisp, tools: `generate_office_document`, `save_document`).
- Código IA → **Codex** (jarvis, tools: `generate_component`, `create_section`).
- Memoria → **Mnemo** (natural, tools: `remember`, `recall`).
- WhatsApp → **Hermes** (natural, tools: `send_whatsapp`).
- Música → **Rhea** (warm, tools Spotify).
- Análisis IA → **Oráculo** (crisp, tools: `analyze_*`, `web_search`).
- Comunicación → **Iris** (natural, tools: `send_room_message`, `invoke_ai_in_room`).
- Automatizaciones → **Nomad** (jarvis, tools de automations).

**UI dedicada por sección (reemplaza el "chat + widgets genérico"):**
- Imágenes: galería como vista principal + composer de prompt lateral; chat colapsado.
- Documentos: lista + visor embebido; composer minimal.
- Código IA: split code/preview a pantalla completa.
- Comunicación: layout tipo mensajería (sin HUD decorativo).
- Otras secciones mantienen HUD pero con agente propio y tools filtradas.

Cada agente aparece con su nombre y avatar/color en la burbuja del chat, y la barra `LiquidChatBar` muestra "Hablando con **Lumen** · Imágenes".

## Orden de ejecución

1. Migración + realtime + tabla usuarios searchable (base para comunicación).
2. Section-agents registry + filtrado de tools + UI del header del chat (impacto inmediato en identidad).
3. Análisis IA (tools + panel dedicado).
4. Comunicación interna (rooms UI + realtime + IA compartida).
5. Refinar UIs dedicadas por sección (Imágenes/Documentos/Código en modo full).

## Detalles técnicos

- Nuevas deps: ninguna obligatoria (usamos fetch + gateway X existente).
- Conector requerido para tendencias completas: **X** (via `standard_connectors--connect`) — Reddit y Web funcionan sin claves.
- Todo detrás de `requireSupabaseAuth`. Rooms con RLS estricto por membresía.
- `attachments` en room messages reutiliza el bucket `chat-attachments` (signed URLs 1h).

¿Apruebas para ejecutarlo en ese orden?