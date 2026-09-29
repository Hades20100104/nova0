#!/usr/bin/env node
/**
 * E2E para NOVA/NEVIRA.
 *
 * Verifica con sesión activa:
 *   1. Responde a una pregunta (texto)
 *   2. Busca música en Spotify (tool: search_music)
 *   3. Genera una imagen (tool: generate_image)
 *   4. Envía un WhatsApp de ejemplo (tool: send_whatsapp)
 *
 * Uso:
 *   TEST_EMAIL=usuario@dominio.com \
 *   TEST_PASSWORD='********' \
 *   TEST_WHATSAPP_PHONE='5215555555555' \
 *   APP_URL='https://nova0.lovable.app' \
 *   node scripts/e2e-assistant.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://lsxkihcbdkafslprjwdd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeGtpaGNiZGthZnNscHJqd2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTk5NzIsImV4cCI6MjA5MjUzNTk3Mn0.8eewjPgyt1cXVdKW9cDVaK5wOvP1Nex-U1FjSYxLGWA";
const APP_URL = process.env.APP_URL || "https://nova0.lovable.app";
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const PHONE = process.env.TEST_WHATSAPP_PHONE; // E.164 sin '+', opcional

if (!EMAIL || !PASSWORD) {
  console.error("✖ Faltan TEST_EMAIL / TEST_PASSWORD");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const step = (label) => console.log(`\n── ${label} ──`);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.error(`  ✖ ${msg}`); process.exitCode = 1; };

async function login() {
  step("Login");
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error || !data.session) throw new Error(`Login: ${error?.message}`);
  ok(`Sesión activa para ${data.user.email}`);
  return { token: data.session.access_token, userId: data.user.id };
}

async function createThread(userId, assistant) {
  const { data, error } = await supabase
    .from("assistant_threads")
    .insert({ user_id: userId, assistant, title: `E2E ${assistant} ${new Date().toISOString()}` })
    .select("id")
    .single();
  if (error) throw new Error(`createThread: ${error.message}`);
  return data.id;
}

async function chat({ token, threadId, assistant, module, text }) {
  const res = await fetch(`${APP_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      threadId,
      assistant,
      module,
      messages: [{ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

  // Lee todo el UI message stream y agrega texto + tools usados.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text_out = "";
  const tools = []; // {name, input, output, error}
  const toolsById = new Map();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "text-delta" && ev.delta) text_out += ev.delta;
        else if (ev.type?.startsWith("tool-input-available")) {
          const t = { name: ev.toolName, input: ev.input };
          toolsById.set(ev.toolCallId, t);
          tools.push(t);
        } else if (ev.type?.startsWith("tool-output-available")) {
          const t = toolsById.get(ev.toolCallId);
          if (t) t.output = ev.output;
        } else if (ev.type === "error") {
          tools.push({ name: "stream-error", error: ev.errorText });
        }
      } catch { /* ignore */ }
    }
  }
  return { text: text_out, tools };
}

async function main() {
  const { token, userId } = await login();

  // 1) Texto
  step("1) Respuesta de texto (NEVIRA)");
  let threadId = await createThread(userId, "nevira");
  let r = await chat({ token, threadId, assistant: "nevira", module: "home",
    text: "Responde en una frase: ¿cuál es la capital de Japón?" });
  console.log("  texto:", r.text.slice(0, 200));
  /tokio/i.test(r.text) ? ok("Respondió Tokio") : fail("No respondió texto coherente");

  // 2) Spotify
  step("2) search_music (Spotify)");
  threadId = await createThread(userId, "nova");
  r = await chat({ token, threadId, assistant: "nova", module: "musica",
    text: "Búscame 3 canciones de Daft Punk en Spotify usando tu herramienta." });
  const music = r.tools.find((t) => t.name === "search_music");
  if (!music) fail("No invocó search_music");
  else if (music.output?.ok && music.output.tracks?.length) ok(`Encontró ${music.output.tracks.length} tracks`);
  else fail(`search_music: ${JSON.stringify(music.output).slice(0, 200)}`);

  // 3) Imagen
  step("3) generate_image");
  threadId = await createThread(userId, "nova");
  r = await chat({ token, threadId, assistant: "nova", module: "imagenes",
    text: "Genera una imagen: un astronauta meditando en un planeta púrpura, estilo cinematográfico." });
  const img = r.tools.find((t) => t.name === "generate_image");
  if (!img) fail("No invocó generate_image");
  else if (img.output?.ok && img.output.url) ok(`Imagen: ${img.output.url.slice(0, 80)}…`);
  else fail(`generate_image: ${JSON.stringify(img.output).slice(0, 200)}`);

  // 4) WhatsApp (sólo si PHONE provisto)
  step("4) send_whatsapp");
  if (!PHONE) {
    console.log("  (omitido: define TEST_WHATSAPP_PHONE para probarlo)");
  } else {
    threadId = await createThread(userId, "nevira");
    r = await chat({ token, threadId, assistant: "nevira", module: "whatsapp",
      text: `Envía un WhatsApp al número ${PHONE} con el mensaje "Hola desde la prueba E2E ✅".` });
    const wa = r.tools.find((t) => t.name === "send_whatsapp");
    if (!wa) fail("No invocó send_whatsapp");
    else if (wa.output?.ok) ok(`Enviado a ${wa.output.to}`);
    else fail(`send_whatsapp: ${JSON.stringify(wa.output).slice(0, 200)}`);
  }

  step("Resumen");
  console.log(process.exitCode ? "  ✖ Algunas comprobaciones fallaron" : "  ✓ Todas las comprobaciones pasaron");
}

main().catch((e) => { console.error("✖", e.message); process.exit(1); });
