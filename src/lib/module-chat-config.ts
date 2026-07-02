// Per-module chat panel identity (color, tone) + quick actions that fit the section.
// Chips inject a prompt into the composer; the assistant will invoke the matching tool
// (search_music, generate_image, send_whatsapp, save_memory, generate_document...).

export type ChatChip = { label: string; prompt: string };

export type ModuleChatConfig = {
  tag: string;
  title?: string;
  accent: string; // primary color
  accent2: string; // gradient partner
  aura: string; // radial glow color (with alpha)
  chips: ChatChip[];
};

const NOVA: Record<string, ModuleChatConfig> = {
  home: {
    tag: "Modo libre",
    title: "Conversa con NOVA",
    accent: "oklch(0.78 0.19 305)",
    accent2: "oklch(0.68 0.22 25)",
    aura: "color-mix(in oklab, oklch(0.78 0.19 305) 28%, transparent)",
    chips: [
      { label: "Inspírame", prompt: "Inspírame con una idea creativa hoy" },
      { label: "Cuéntame algo", prompt: "Cuéntame una metáfora cósmica" },
      { label: "¿Qué puedes hacer?", prompt: "¿Qué puedes hacer por mí?" },
    ],
  },
  conversacion: {
    tag: "Charla profunda",
    accent: "oklch(0.72 0.15 340)",
    accent2: "oklch(0.65 0.18 290)",
    aura: "color-mix(in oklab, oklch(0.72 0.15 340) 26%, transparent)",
    chips: [
      { label: "Desahogarme", prompt: "Necesito desahogarme un momento" },
      { label: "Entender emoción", prompt: "Ayúdame a entender lo que estoy sintiendo" },
      { label: "Pregunta profunda", prompt: "Hazme una pregunta filosófica que me haga pensar" },
    ],
  },
  musica: {
    tag: "Estudio sonoro",
    title: "Música con NOVA",
    accent: "oklch(0.75 0.19 145)",
    accent2: "oklch(0.65 0.2 200)",
    aura: "color-mix(in oklab, oklch(0.75 0.19 145) 30%, transparent)",
    chips: [
      { label: "🔎 Buscar Daft Punk", prompt: "Busca canciones de Daft Punk en Spotify" },
      { label: "▶️ Reproducir algo chill", prompt: "Reproduce algo chill para trabajar" },
      { label: "🎵 Playlist coding", prompt: "Arma una playlist para programar de noche" },
      { label: "✍️ Letra synthwave", prompt: "Escribe una letra estilo synthwave sobre viajar en el tiempo" },
    ],
  },
  imagenes: {
    tag: "Estudio visual",
    title: "Genera imágenes",
    accent: "oklch(0.75 0.2 30)",
    accent2: "oklch(0.7 0.22 350)",
    aura: "color-mix(in oklab, oklch(0.75 0.2 30) 28%, transparent)",
    chips: [
      { label: "🎨 Ciudad neón", prompt: "Genera una imagen cinematográfica de una ciudad neón bajo la lluvia" },
      { label: "👤 Retrato surrealista", prompt: "Genera un retrato surrealista al estilo Moebius" },
      { label: "🌅 Paisaje alienígena", prompt: "Genera un paisaje alienígena al atardecer con dos lunas" },
    ],
  },
  documentos: {
    tag: "Redacción",
    accent: "oklch(0.78 0.14 90)",
    accent2: "oklch(0.7 0.16 50)",
    aura: "color-mix(in oklab, oklch(0.78 0.14 90) 24%, transparent)",
    chips: [
      { label: "📄 Generar ensayo", prompt: "Genera un documento tipo ensayo corto sobre la conciencia artificial" },
      { label: "✉️ Mejorar email", prompt: "Ayúdame a mejorar la redacción de un email profesional" },
      { label: "📝 Resumir en 3 puntos", prompt: "Resume este tema en 3 puntos clave: (pega tu texto)" },
    ],
  },
  memoria: {
    tag: "Mente digital",
    accent: "oklch(0.72 0.17 270)",
    accent2: "oklch(0.65 0.19 310)",
    aura: "color-mix(in oklab, oklch(0.72 0.17 270) 26%, transparent)",
    chips: [
      { label: "💾 Recuerda esto", prompt: "Recuerda que mi color favorito es el violeta y me gusta el jazz" },
      { label: "🔗 Conectar ideas", prompt: "Conecta las ideas: arte, IA y conciencia" },
      { label: "🗺️ Mapa personal", prompt: "Ayúdame a mapear mi conocimiento personal" },
    ],
  },
  automatizaciones: {
    tag: "Flujos",
    accent: "oklch(0.78 0.17 200)",
    accent2: "oklch(0.7 0.18 240)",
    aura: "color-mix(in oklab, oklch(0.78 0.17 200) 26%, transparent)",
    chips: [
      { label: "☀️ Rutina matutina", prompt: "Diseña una rutina matutina de 30 minutos" },
      { label: "📥 Flujo de emails", prompt: "Diseña un flujo para responder emails con eficiencia" },
    ],
  },
  calendario: {
    tag: "Tiempo",
    accent: "oklch(0.78 0.15 175)",
    accent2: "oklch(0.7 0.17 220)",
    aura: "color-mix(in oklab, oklch(0.78 0.15 175) 24%, transparent)",
    chips: [
      { label: "📅 Planifica mi semana", prompt: "Planifica mi semana en bloques de trabajo profundo" },
      { label: "✈️ Viaje 3 días", prompt: "Organiza un viaje de 3 días a la costa" },
    ],
  },
  whatsapp: {
    tag: "Mensajería",
    title: "WhatsApp con NOVA",
    accent: "oklch(0.78 0.19 145)",
    accent2: "oklch(0.72 0.17 165)",
    aura: "color-mix(in oklab, oklch(0.78 0.19 145) 26%, transparent)",
    chips: [
      { label: "📱 Enviar mensaje", prompt: "Envía un WhatsApp de prueba a mi contacto principal diciendo: hola desde NOVA" },
      { label: "🎂 Felicitación creativa", prompt: "Redacta una felicitación de cumpleaños original y cálida" },
      { label: "🙏 Disculpa profesional", prompt: "Redacta una disculpa profesional breve" },
    ],
  },
  finanzas: {
    tag: "Finanzas",
    accent: "oklch(0.78 0.18 130)",
    accent2: "oklch(0.72 0.15 90)",
    aura: "color-mix(in oklab, oklch(0.78 0.18 130) 24%, transparent)",
    chips: [
      { label: "💰 Presupuesto", prompt: "Ayúdame a armar un presupuesto mensual simple" },
      { label: "🐖 Ahorrar", prompt: "Dame tips prácticos para empezar a ahorrar" },
    ],
  },
  ajustes: {
    tag: "Preferencias",
    accent: "oklch(0.72 0.02 260)",
    accent2: "oklch(0.65 0.03 280)",
    aura: "color-mix(in oklab, oklch(0.72 0.02 260) 22%, transparent)",
    chips: [
      { label: "🧭 Módulos", prompt: "¿Qué módulos tienes disponibles?" },
      { label: "🎨 Cambiar tono", prompt: "Cambia mi tono preferido de conversación" },
    ],
  },
};

const NEVIRA: Record<string, ModuleChatConfig> = {
  panel: {
    tag: "Panel",
    accent: "oklch(0.75 0.18 220)",
    accent2: "oklch(0.68 0.19 260)",
    aura: "color-mix(in oklab, oklch(0.75 0.18 220) 26%, transparent)",
    chips: [
      { label: "📊 Resumen del día", prompt: "Dame un resumen ejecutivo de mi día" },
      { label: "🎯 KPIs", prompt: "Muéstrame los KPIs principales" },
    ],
  },
  productividad: {
    tag: "GTD · OKR",
    accent: "oklch(0.78 0.16 190)",
    accent2: "oklch(0.7 0.18 220)",
    aura: "color-mix(in oklab, oklch(0.78 0.16 190) 26%, transparent)",
    chips: [
      { label: "✅ Plan GTD", prompt: "Aplica GTD para organizar mi semana" },
      { label: "🎯 OKRs", prompt: "Define mis OKRs para el próximo trimestre" },
      { label: "📌 Priorizar 5", prompt: "Prioriza 5 tareas con matriz Eisenhower" },
    ],
  },
  analisis: {
    tag: "Insights",
    accent: "oklch(0.72 0.18 290)",
    accent2: "oklch(0.65 0.2 320)",
    aura: "color-mix(in oklab, oklch(0.72 0.18 290) 26%, transparent)",
    chips: [
      { label: "🔍 Patrones", prompt: "Detecta patrones en mis datos recientes" },
      { label: "🧠 FODA rápido", prompt: "Hazme un análisis FODA rápido de mi proyecto" },
    ],
  },
  automatizaciones: {
    tag: "Workflows",
    accent: "oklch(0.78 0.17 200)",
    accent2: "oklch(0.7 0.18 240)",
    aura: "color-mix(in oklab, oklch(0.78 0.17 200) 26%, transparent)",
    chips: [
      { label: "⚙️ Flujo email", prompt: "Diseña un flujo con triggers para responder emails" },
      { label: "🔁 Rutina", prompt: "Diseña una rutina automatizada de reportes diarios" },
    ],
  },
  datos: {
    tag: "Métricas",
    accent: "oklch(0.75 0.16 240)",
    accent2: "oklch(0.68 0.19 270)",
    aura: "color-mix(in oklab, oklch(0.75 0.16 240) 24%, transparent)",
    chips: [
      { label: "📈 Reporte ejecutivo", prompt: "Diseña un reporte ejecutivo con las métricas clave de un SaaS" },
      { label: "🧩 Dashboard", prompt: "Estructura un dashboard con las métricas más importantes" },
    ],
  },
  comunicacion: {
    tag: "Mensajes",
    accent: "oklch(0.78 0.18 145)",
    accent2: "oklch(0.72 0.17 175)",
    aura: "color-mix(in oklab, oklch(0.78 0.18 145) 26%, transparent)",
    chips: [
      { label: "📱 WhatsApp de prueba", prompt: "Envía un WhatsApp de prueba a mi contacto principal" },
      { label: "✉️ Email inversor", prompt: "Redacta un email formal a un inversor" },
    ],
  },
  memoria: {
    tag: "Contexto",
    accent: "oklch(0.72 0.17 270)",
    accent2: "oklch(0.65 0.19 310)",
    aura: "color-mix(in oklab, oklch(0.72 0.17 270) 26%, transparent)",
    chips: [
      { label: "💾 Guardar hecho", prompt: "Recuerda esto: mi proyecto principal es NOVA" },
      { label: "🕰️ Línea temporal", prompt: "Arma una línea temporal de mis proyectos activos" },
    ],
  },
  seguridad: {
    tag: "Defensa",
    accent: "oklch(0.72 0.19 25)",
    accent2: "oklch(0.68 0.18 350)",
    aura: "color-mix(in oklab, oklch(0.72 0.19 25) 24%, transparent)",
    chips: [
      { label: "🛡️ Auditoría", prompt: "Hazme una auditoría rápida de mi configuración de seguridad" },
      { label: "🔐 Contraseñas", prompt: "Buenas prácticas para contraseñas fuertes" },
    ],
  },
  sistema: {
    tag: "Sistema",
    accent: "oklch(0.75 0.15 210)",
    accent2: "oklch(0.68 0.17 240)",
    aura: "color-mix(in oklab, oklch(0.75 0.15 210) 24%, transparent)",
    chips: [
      { label: "🩺 Estado", prompt: "Diagnóstico técnico del sistema" },
      { label: "⚡ Optimizar", prompt: "Optimiza recursos del sistema" },
    ],
  },
  rendimiento: {
    tag: "Perf",
    accent: "oklch(0.78 0.19 60)",
    accent2: "oklch(0.72 0.18 30)",
    aura: "color-mix(in oklab, oklch(0.78 0.19 60) 24%, transparent)",
    chips: [
      { label: "🧮 CPU/RAM", prompt: "Muéstrame estado de CPU, RAM y procesos" },
      { label: "🚧 Cuellos", prompt: "Detecta cuellos de botella" },
    ],
  },
  codigo: {
    tag: "Laboratorio",
    accent: "oklch(0.72 0.19 170)",
    accent2: "oklch(0.65 0.2 200)",
    aura: "color-mix(in oklab, oklch(0.72 0.19 170) 26%, transparent)",
    chips: [
      { label: "⚛️ Componente React", prompt: "Genera un componente React con TypeScript para un formulario de login" },
      { label: "🏛️ Arquitectura", prompt: "Diseña una arquitectura de microservicios para una app de mensajería" },
    ],
  },
  ajustes: {
    tag: "Preferencias",
    accent: "oklch(0.72 0.02 260)",
    accent2: "oklch(0.65 0.03 280)",
    aura: "color-mix(in oklab, oklch(0.72 0.02 260) 22%, transparent)",
    chips: [
      { label: "🎨 Tema", prompt: "Cambia el tema visual" },
      { label: "🔤 Tipografía", prompt: "Cambia la tipografía" },
    ],
  },
};

const FALLBACK: ModuleChatConfig = {
  tag: "Chat",
  accent: "oklch(0.75 0.18 280)",
  accent2: "oklch(0.7 0.2 320)",
  aura: "color-mix(in oklab, oklch(0.75 0.18 280) 24%, transparent)",
  chips: [],
};

export function getModuleChatConfig(assistant: "nova" | "nevira", module: string): ModuleChatConfig {
  const map = assistant === "nova" ? NOVA : NEVIRA;
  return map[module] ?? FALLBACK;
}
