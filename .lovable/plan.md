
# Rediseño completo NEVIRA / NOVA

Adopto el sistema visual del ZIP `nova-nevira-companion-main`: dos modos completos con switch, sidebar modular, tipografía y tokens de color del nuevo `styles.css`, layout estilo HUD para NEVIRA y atmósfera holográfica para NOVA. Mantengo todo el backend actual (chat agente, música/Spotify, imágenes IA, documentos, automatizaciones, WhatsApp, memoria, skills, auth con Supabase).

## Arquitectura de rutas

Reemplazo el árbol actual por dos layouts pathless con sus propios sidebars:

```
src/routes/
  __root.tsx              (shell html, ThemeProvider NEVIRA↔NOVA)
  index.tsx               (landing/redirect a /nova o /nevira según último modo)
  auth.tsx                (sin cambios funcionales, re-skin)
  _nova.tsx               (layout NOVA: sidebar violeta + LiquidChatBar)
    _nova/inicio.tsx
    _nova/conversacion.tsx     -> usa chat agente actual
    _nova/musica.tsx           -> Spotify + MusicPlayerWidget
    _nova/imagenes.tsx         -> image.functions actual
    _nova/documentos.tsx       -> docs.functions actual
    _nova/memoria.tsx          -> memory.functions actual
    _nova/automatizaciones.tsx -> automations actual
    _nova/calendario.tsx       (UI demo)
    _nova/whatsapp.tsx         -> whatsapp.functions actual
    _nova/finanzas.tsx         (UI demo)
    _nova/ajustes.tsx          (tema, tipografía, paleta, asistente)
  _nevira.tsx             (layout NEVIRA Core: sidebar cian + HUD)
    _nevira/panel.tsx           (Director del panel — vista general)
    _nevira/productividad.tsx   (UI demo: tareas/proyectos/notas)
    _nevira/automatizaciones.tsx (reusa runner real + grafo demo)
    _nevira/comunicacion.tsx    (UI demo)
    _nevira/analisis.tsx        (UI demo)
    _nevira/datos.tsx           (UI demo)
    _nevira/memoria.tsx         (UI demo del grafo)
    _nevira/codigo.tsx          (UI demo del laboratorio de código)
    _nevira/seguridad.tsx       (UI demo)
    _nevira/sistema.tsx         (UI demo)
    _nevira/rendimiento.tsx     (UI demo CPU/RAM/GPU)
```

Las rutas viejas (`/chat`, `/automations`, `/gallery`, `/spotify/callback`) se mantienen como redirects al equivalente NOVA para no romper enlaces.

## Sistema de diseño

- `src/styles.css` reescrito con los dos temas (NEVIRA día / NOVA noche) y variantes de paleta (Aurora, Rosa Cósmica, Bosque Cuántico, Solar, Monocromo) y pares tipográficos (Sora, Atuendo, Instrument Serif, JetBrains Mono).
- `src/lib/theme.ts`: provider con `mode: "nevira" | "nova"`, `palette`, `font`, persistido en localStorage + tabla `user_preferences` (ya existe en backend para sincronizar).
- Switch ESTRELLA NUEVA ↔ NEVIRA en cada sidebar; navega al layout opuesto.

## Componentes nuevos (portados/adaptados del ZIP)

- `ModuleSidebar` (lista de módulos por modo, con categorías CREAR/PENSAR/CONECTAR para NOVA y OPERADOR/ANALIZAR/PROTEGIDO para NEVIRA).
- `LiquidChatBar` (composer flotante inferior, “Escribe o habla con NOVA…” / “Consulta a NEVIRA…”) que invoca el chat agente real.
- `ModulePanel` (marco con esquinas HUD, encabezado + descripción).
- `ClockBadge`, `PerfGauge`, `HudTelemetry`, `Waveform`, `ListeningWidget`, `MusicPlayerWidget`, `RecentActivity`, `QuickAccessBar`, `NovaSphere`, `NeviraCube`, `Icon3D`.
- Páginas demo: portar el contenido visual de `ModuleSections.tsx` (892 líneas) repartido en cada ruta correspondiente.

## Backend (sin cambios estructurales)

- Reuso de: `chat.functions`, `image.functions`, `docs.functions`, `memory.functions`, `skills.functions`, `sandbox.functions`, `spotify.functions`, `whatsapp.functions`, `web-search.functions`, `automations`.
- Auth y RLS existentes intactos.
- Las páginas demo nuevas (Finanzas, Productividad, NEVIRA Core/Análisis/Seguridad/etc.) usan datos mock con `// TODO: conectar a backend` marcado.

## Limpieza

Componentes actuales que dejan de usarse y se eliminan: `HomeHero`, `Orb`, `AppSidebar`, `MobileTabBar`, `MenuDrawer`, `QuickActions`, `DashboardCard`, `OnboardingModal` (reemplazo por nuevo onboarding minimal), `ThemeSwitch` (lo reemplaza el switch dual del sidebar). `ChatBubble`, `ChatComposer`, `ImageMessage`, `SpotifyPlayer`, `PickerMap`, `SoundWaves`, `WhatsAppConfirm`, `SkillsManager`, `SettingsDrawer`, `AgentActionChip` se mantienen y se re-skinnean para encajar con el nuevo tema (sin lógica nueva).

## Detalles técnicos clave

- Tipografía cargada vía `<link>` en `__root.tsx` (Sora, Outfit/Atuendo, Instrument Serif, JetBrains Mono) — nunca `@import` URL.
- Tokens en `@theme inline` para soportar el patrón shadcn.
- Sidebar implementado con `@/components/ui/sidebar` (shadcn) + estilos custom para el look HUD/holográfico.
- LiquidChatBar es global dentro de cada layout (`_nova.tsx` / `_nevira.tsx`) y comparte estado con la ruta activa para enviar prompts contextuales al chat agente.
- `index.tsx` lee la preferencia y redirige a `/nova/inicio` o `/nevira/panel`.

## Entrega en orden

1. styles.css + theme.ts + provider + fuentes en `__root.tsx`.
2. ModuleSidebar + LiquidChatBar + ModulePanel + primitivos HUD.
3. Layouts `_nova.tsx` y `_nevira.tsx` + redirect en `index.tsx` + redirects de rutas viejas.
4. Páginas NOVA (Inicio, Conversación, Música, Imágenes, Documentos, Memoria, Automatizaciones, Calendario, WhatsApp, Finanzas, Ajustes) conectando las server functions reales donde existen.
5. Páginas NEVIRA Core (Panel, Productividad, Automatizaciones, Comunicación, Análisis, Datos, Memoria, Código, Seguridad, Sistema, Rendimiento) como UI demo con datos mock.
6. Eliminación de componentes obsoletos y verificación de tipos/build.

¿Apruebas el plan para implementarlo?
