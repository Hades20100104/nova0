# Plan: 4 mejoras mayores

## 1) Preview de código en "Código IA"

- Nueva sección/módulo `codigo` (Nova/Nevira) con:
- Editor read-only (Monaco ligero o `<pre>` con highlight) mostrando el código generado.
- Sandbox de preview: `<iframe srcDoc>` que renderiza HTML/CSS/JS o un bundle React vía `@babel/standalone` + import maps (React/ReactDOM UMD).
- Toggle Code / Preview / Split.

- Nueva tool `generate_component` en `chat-tools.ts`: el LLM devuelve `{ language: 'html'|'react', code }`, se guarda en tabla `code_artifacts` (id, user_id, title, language, code, created_at).
- Hook `useCodeArtifacts` + componente `CodeSandboxViewer.tsx`.

## 2) Personalización ampliada (incluye NEVIRA)

- Extender `src/lib/theme.ts`:
  - Presets Nevira (Cyan HUD, Amber Tactical, Emerald Ops, Crimson Alert, Mono Ghost).
  - Presets Nova adicionales (Aurora, Sunset, Nebula Green).
  - Controles: intensidad glow (0–100), densidad de grilla HUD, radio de bordes, animaciones on/off, wallpaper (gradient / solid / imagen).
- `ThemeSettings.tsx` reorganizado en tabs Nova / Nevira / Global (fuente, densidad, animaciones).
- Persistencia en `user_memory` (key `ui:prefs`) además de localStorage.

## 3) Ventana de contexto + adjuntos

- `LiquidChatBar` y `InlineChatPanel`: botón 📎 para imágenes (jpg/png/webp) y archivos (pdf, txt, md, csv).
  - Subida a bucket `chat-attachments` (nuevo, privado), signed URL 1h.
  - Se envían al chat como `content` multimodal (`image_url` o `file` con base64/URL).
- Aumentar historial en `chat.functions.ts`: pasar últimos 30 mensajes (antes probable 10).
- Tabla `assistant_messages`: añadir columna `attachments jsonb` para persistir metadatos.

## 4) Documentos Office + visor

- Tool `generate_office_document` (docx / xlsx / pptx) usando:
  - `docx` (npm) para Word.
  - `exceljs` para Excel.
  - `pptxgenjs` para PowerPoint.
  - Se ejecuta en server fn, sube a bucket `generated-docs`, registra en `generated_documents` con `format`.
- Visor in-app:
  - PDF/imagen: iframe.
  - docx/xlsx/pptx: Office Online viewer (`https://view.officeapps.live.com/op/embed.aspx?src=<signed_url>`) como iframe, con fallback de descarga.
- Nueva sección `documentos` con lista + `DocumentViewer.tsx` modal.

## Detalles técnicos

- Migraciones: `code_artifacts`, columna `attachments` en `assistant_messages`, bucket `chat-attachments`.
- Nuevas deps: `docx`, `exceljs`, `pptxgenjs`, `@babel/standalone` (para preview React), `prismjs` (highlight liviano).
- Server fns nuevas: `saveCodeArtifact`, `listCodeArtifacts`, `generateOfficeDoc`, `uploadChatAttachment`.
- Todo detrás de `requireSupabaseAuth`.

## Orden de ejecución

1. Migraciones + buckets.
2. Adjuntos + contexto extendido (base para todo el chat).
3. Personalización (rápido, aislado).
4. Código IA + preview.
5. Documentos Office + visor.

¿Apruebas para implementarlo todo en secuencia?