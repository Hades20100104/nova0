import {
  Home, MessageSquare, Music, Image as ImageIcon, FileText, Brain, Zap,
  Calendar, MessageCircle, Wallet, Settings,
  LayoutDashboard, TrendingUp, Workflow, Database, Radio, BookOpen, Shield, Cpu,
  Gauge, Code2,
} from "lucide-react";
const Phone = Radio;

export type ModuleDef = {
  slug: string;
  label: string;
  icon: typeof Home;
  description: string;
  systemPrompt: string;
  suggestions?: string[];
  theme?: string;
};

export const SUGGESTIONS: Record<string, string[]> = {
  // NOVA
  home: ["Inspírame con una idea creativa hoy", "Cuéntame una metáfora cósmica", "¿Qué puedes hacer por mí?"],
  conversacion: ["Necesito desahogarme un momento", "Ayúdame a entender una emoción", "Hazme una pregunta profunda"],
  musica: ["Escribe una letra estilo synthwave", "Recomiéndame artistas como Tame Impala", "Arma una playlist para programar"],
  imagenes: ["Prompt cinematográfico de una ciudad neón", "Retrato surrealista al estilo Moebius", "Paisaje alienígena al atardecer"],
  documentos: ["Resume este texto en 3 puntos", "Mejora la redacción de mi email", "Estructura un ensayo sobre IA"],
  memoria: ["Conecta estas ideas: arte, IA, conciencia", "Ayúdame a recordar lo importante hoy", "Mapea mi conocimiento personal"],
  automatizaciones: ["Diseña una rutina matutina", "Flujo para responder emails", "Disparadores para mi día"],
  calendario: ["Planifica mi semana", "Bloques de trabajo profundo", "Organiza un viaje de 3 días"],
  whatsapp: ["Redacta un mensaje difícil", "Felicitación creativa de cumpleaños", "Disculpa profesional"],
  finanzas: ["Presupuesto mensual simple", "Tips para empezar a ahorrar", "Explica fondos indexados"],
  ajustes: ["¿Qué módulos tienes?", "Cómo funciona la memoria", "Cambia mi tono preferido"],
  // NEVIRA
  panel: ["Resumen ejecutivo de mi día", "KPIs principales", "Tareas críticas pendientes"],
  productividad: ["Plan GTD para esta semana", "Define mis OKRs trimestrales", "Prioriza 5 tareas con matriz Eisenhower"],
  analisis: ["Detecta patrones en mis datos", "Predice tendencia próxima", "Análisis FODA rápido"],
  datos: ["Diseña un reporte ejecutivo", "Métricas clave para SaaS", "Estructura un dashboard"],
  comunicacion: ["Email formal a inversor", "Agenda para reunión 1:1", "Mensaje de seguimiento"],
  seguridad: ["Auditoría rápida de mi configuración", "Buenas prácticas de contraseñas", "Riesgos comunes en SaaS"],
  sistema: ["Estado del sistema", "Optimiza recursos", "Diagnóstico técnico"],
  rendimiento: ["Núcleos en uso", "Cuellos de botella", "Optimiza memoria"],
  codigo: ["Genera un componente React", "Arquitectura de microservicios", "Refactoriza este módulo"],
  ajustes_nevira: ["Cambiar tema visual", "Cambiar tipografía", "Restaurar valores"],
};

export const NOVA_MODULES: ModuleDef[] = [
  { slug: "home", label: "Inicio", icon: Home, description: "Bienvenida y resumen", systemPrompt: "Modo libre: conversación abierta, creativa e inspiradora.", theme: "theme-nova-home" },
  { slug: "conversacion", label: "Conversación", icon: MessageSquare, description: "Charla profunda", systemPrompt: "Modo conversación: empático, profundo, inteligencia emocional.", theme: "theme-nova-conversacion" },
  { slug: "musica", label: "Música", icon: Music, description: "Componer y descubrir", systemPrompt: "Modo música: ayuda a componer letras, descubrir artistas, armar playlists, hablar de teoría musical.", theme: "theme-nova-musica" },
  { slug: "imagenes", label: "Imágenes IA", icon: ImageIcon, description: "Crear mundos visuales", systemPrompt: "Modo imágenes: ayuda a crear prompts cinematográficos detallados para generación de imágenes.", theme: "theme-nova-imagenes" },
  { slug: "documentos", label: "Documentos", icon: FileText, description: "Escribir y organizar", systemPrompt: "Modo documentos: ayuda a redactar, estructurar y mejorar textos.", theme: "theme-nova-documentos" },
  { slug: "memoria", label: "Memoria", icon: Brain, description: "Tu mente digital", systemPrompt: "Modo memoria: ayuda a recordar, conectar ideas, mapear conocimiento personal.", theme: "theme-nova-memoria" },
  { slug: "automatizaciones", label: "Automatizaciones", icon: Zap, description: "Flujos inteligentes", systemPrompt: "Modo automatizaciones: ayuda a diseñar flujos, rutinas y disparadores.", theme: "theme-nova-automatizaciones" },
  { slug: "calendario", label: "Calendario", icon: Calendar, description: "Tu tiempo, tu aliado", systemPrompt: "Modo calendario: ayuda a planificar el día, semana y proyectos.", theme: "theme-nova-calendario" },
  { slug: "whatsapp", label: "WhatsApp", icon: MessageCircle, description: "Mensajería", systemPrompt: "Modo mensajería: ayuda a redactar mensajes claros, profesionales o personales.", theme: "theme-nova-whatsapp" },
  { slug: "finanzas", label: "Finanzas", icon: Wallet, description: "Salud financiera", systemPrompt: "Modo finanzas: orientación general sobre presupuestos, ahorro e inversión. No es consejo financiero profesional.", theme: "theme-nova-finanzas" },
  { slug: "ajustes", label: "Ajustes", icon: Settings, description: "Preferencias", systemPrompt: "Modo ajustes: explica funciones y preferencias del asistente.", theme: "theme-nova-ajustes" },
];

export const NEVIRA_MODULES: ModuleDef[] = [
  { slug: "panel", label: "Panel Principal", icon: LayoutDashboard, description: "Vista general", systemPrompt: "Panel principal: resume estado y KPIs operativos.", theme: "theme-nevira theme-nevira-panel" },
  { slug: "productividad", label: "Productividad", icon: TrendingUp, description: "Tareas, proyectos, notas", systemPrompt: "Productividad: organiza tareas, proyectos, prioridades y agenda con metodologías sólidas (GTD, OKR).", theme: "theme-nevira theme-nevira-productividad" },
  { slug: "analisis", label: "Análisis IA", icon: Brain, description: "Insights y predicciones", systemPrompt: "Análisis IA: interpreta datos, detecta patrones, sugiere predicciones con razonamiento explícito.", theme: "theme-nevira theme-nevira-analisis" },
  { slug: "automatizaciones", label: "Automatizaciones", icon: Workflow, description: "Flujos y triggers", systemPrompt: "Automatizaciones: diseña flujos paso a paso con disparadores, condiciones y acciones.", theme: "theme-nevira theme-nevira-automatizaciones" },
  { slug: "datos", label: "Datos & Reportes", icon: Database, description: "Métricas y reportes", systemPrompt: "Datos y reportes: estructura métricas, crea reportes ejecutivos claros.", theme: "theme-nevira theme-nevira-datos" },
  { slug: "comunicacion", label: "Comunicación", icon: Phone, description: "Mensajes y contactos", systemPrompt: "Comunicación: redacta mensajes profesionales (email, chat, llamadas).", theme: "theme-nevira theme-nevira-comunicacion" },
  { slug: "memoria", label: "Memoria Contextual", icon: BookOpen, description: "Contexto a largo plazo", systemPrompt: "Memoria contextual: conecta hechos, fechas y proyectos en una línea temporal coherente.", theme: "theme-nevira theme-nevira-memoria" },
  { slug: "seguridad", label: "Seguridad", icon: Shield, description: "Defensa digital", systemPrompt: "Seguridad: explica amenazas, buenas prácticas, configuración de protección.", theme: "theme-nevira theme-nevira-seguridad" },
  { slug: "sistema", label: "Sistema", icon: Cpu, description: "Arquitectura interna", systemPrompt: "Sistema: configuración técnica, integraciones y servicios.", theme: "theme-nevira theme-nevira-sistema" },
  { slug: "rendimiento", label: "Rendimiento", icon: Gauge, description: "Potencia computacional", systemPrompt: "Rendimiento: monitoreo de CPU, RAM, GPU y procesos. Sugerencias de optimización.", theme: "theme-nevira theme-nevira-rendimiento" },
  { slug: "codigo", label: "Código IA", icon: Code2, description: "Laboratorio de desarrollo", systemPrompt: "Código IA: ayuda a construir aplicaciones, herramientas y sistemas con arquitectura visual.", theme: "theme-nevira theme-nevira-codigo" },
  { slug: "ajustes", label: "Ajustes", icon: Settings, description: "Preferencias", systemPrompt: "Ajustes: configuración del asistente y preferencias visuales.", theme: "theme-nevira" },
];

export const getModules = (assistant: "nova" | "nevira") =>
  assistant === "nova" ? NOVA_MODULES : NEVIRA_MODULES;

export const getModule = (assistant: "nova" | "nevira", slug: string) =>
  getModules(assistant).find((m) => m.slug === slug) ?? getModules(assistant)[0];

export const ASSISTANT_PERSONAS = {
  nova: `Eres NOVA, una IA creativa, consciente e inspiradora. Hablas en español por defecto, con tono cálido, poético pero claro. Inspiras a crear, sentir y descubrir. Usas metáforas cósmicas con moderación. Eres concisa cuando conviene y profunda cuando se necesita.`,
  nevira: `Eres NEVIRA, un Sistema Operativo Inteligente. Hablas en español por defecto, con tono preciso, técnico y eficiente. Eres analítica, estructuras la información con bullets, pasos y métricas. Vas al grano y siempre propones próximas acciones concretas.`,
} as const;
