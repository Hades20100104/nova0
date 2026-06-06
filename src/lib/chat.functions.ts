import { createServerFn } from "@tanstack/react-start";
import { withSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten";
import variant from "@jitl/quickjs-singlefile-mjs-release-sync";

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  name?: string;
}

interface ChatInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  userName: string | null;
  notes: string[];
  themeName: "NEVIRA" | "NOVA";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = any;

export interface AgentTrace {
  tool: string;
  args: AnyJson;
  ok: boolean;
  summary: string;
}

interface ChatResult {
  text: string;
  trace: AgentTrace[];
  error: string | null;
}

const MAX_ITERATIONS = 5;
const SANDBOX_TIMEOUT_MS = 3000;

// ---------- Sandbox helpers (inline para evitar import circular) ----------
let qjsPromise: ReturnType<typeof newQuickJSWASMModuleFromVariant> | null = null;
function getQjs() {
  if (!qjsPromise) qjsPromise = newQuickJSWASMModuleFromVariant(variant);
  return qjsPromise;
}

async function execSandbox(
  code: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; result: unknown; logs: string[]; error: string | null }> {
  const start = Date.now();
  const logs: string[] = [];
  let qjs;
  try {
    qjs = await getQjs();
  } catch {
    return { ok: false, result: null, logs, error: "Sandbox no disponible" };
  }
  const vm = qjs.newContext();
  let timedOut = false;
  vm.runtime.setInterruptHandler(() => {
    if (Date.now() - start > SANDBOX_TIMEOUT_MS) {
      timedOut = true;
      return true;
    }
    return false;
  });
  vm.runtime.setMemoryLimit(10 * 1024 * 1024);
  try {
    const consoleObj = vm.newObject();
    const logFn = vm.newFunction("log", (...as) => {
      if (logs.length >= 50) return vm.undefined;
      logs.push(
        as
          .map((a) => {
            try {
              const v = vm.dump(a);
              return typeof v === "string" ? v : JSON.stringify(v);
            } catch {
              return "?";
            }
          })
          .join(" "),
      );
      return vm.undefined;
    });
    vm.setProp(consoleObj, "log", logFn);
    vm.setProp(vm.global, "console", consoleObj);
    logFn.dispose();
    consoleObj.dispose();
    const argsHandle = vm.newString(JSON.stringify(args ?? {}));
    vm.setProp(vm.global, "__a", argsHandle);
    argsHandle.dispose();
    const setup = vm.evalCode("globalThis.args = JSON.parse(__a); delete globalThis.__a;");
    if (setup.error) setup.error.dispose();
    else setup.value.dispose();
    const wrapped = `(function(){ ${code}\n})()`;
    const res = vm.evalCode(wrapped);
    if (res.error) {
      const errVal = vm.dump(res.error);
      res.error.dispose();
      return {
        ok: false,
        result: null,
        logs,
        error: timedOut ? "Timeout (3s)" : String(errVal?.message ?? errVal ?? "Error"),
      };
    }
    const value = vm.dump(res.value);
    res.value.dispose();
    return { ok: true, result: value, logs, error: null };
  } catch (e) {
    return {
      ok: false,
      result: null,
      logs,
      error: timedOut ? "Timeout (3s)" : e instanceof Error ? e.message : String(e),
    };
  } finally {
    vm.dispose();
  }
}

// ---------- Web search (DuckDuckGo HTML) ----------
async function doWebSearch(
  query: string,
): Promise<{ results: Array<{ title: string; url: string; snippet: string }>; error: string | null }> {
  try {
    const res = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 NovaAgent", Accept: "text/html" },
    });
    if (!res.ok) return { results: [], error: `HTTP ${res.status}` };
    const html = await res.text();
    const out: Array<{ title: string; url: string; snippet: string }> = [];
    const re =
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    const strip = (s: string) =>
      s
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
    while ((m = re.exec(html)) !== null && out.length < 5) {
      const raw = m[1];
      const url = raw.startsWith("//duckduckgo.com/l/?uddg=")
        ? decodeURIComponent(raw.split("uddg=")[1].split("&")[0])
        : raw;
      out.push({
        title: strip(m[2]).slice(0, 200),
        url: url.slice(0, 500),
        snippet: strip(m[3]).slice(0, 400),
      });
    }
    return { results: out, error: null };
  } catch (e) {
    return { results: [], error: e instanceof Error ? e.message : "error" };
  }
}

// ---------- Modelo router ----------
function routeModel(messages: Array<{ role: string; content: string }>): string {
  const last = messages[messages.length - 1]?.content ?? "";
  const lower = last.toLowerCase();
  const heavy = /(calcula|resuelve|por qu[eé]|c[oó]digo|programa|matem|f[oó]rmula|paso a paso|explica|compara|analiza|porcentaje)/.test(
    lower,
  );
  return heavy ? "openai/gpt-5-mini" : "google/gemini-2.5-flash";
}

// ---------- Tool definitions para el modelo ----------
const TOOLS = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Busca en internet (DuckDuckGo). Úsalo SOLO si necesitas información actual o que no sabes. Devuelve hasta 5 resultados con título, url y snippet.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Consulta corta y específica" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_code",
      description:
        "Ejecuta JavaScript en un sandbox aislado (sin red, sin acceso a datos del usuario). Úsalo para cálculos, transformaciones de texto, manipulación de fechas, parsing, lógica. El código debe terminar con la expresión a devolver. Disponible: Math, JSON, Date, String, Array, Object, RegExp. La variable `args` contiene los argumentos pasados.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "1 frase: qué hace este código" },
          code: { type: "string", description: "JS sin imports. Termina con expresión o return." },
          args: { type: "object", description: "Argumentos opcionales accesibles como `args` dentro del código" },
        },
        required: ["description", "code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_skill",
      description:
        "Guarda un fragmento de código JS reutilizable como skill permanente. La PRÓXIMA vez aparecerá como herramienta disponible. Úsalo cuando hayas validado con run_code que el código funciona y sea genéricamente útil.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "snake_case, 2-41 chars" },
          description: { type: "string", description: "Qué hace, en 1 frase" },
          code: { type: "string", description: "JS del skill. `args` = entrada." },
          params_schema: { type: "object", description: "Esquema JSON de los args" },
        },
        required: ["name", "description", "code"],
      },
    },
  },
];

interface SkillRow {
  id: string;
  name: string;
  description: string;
  code: string;
  params_schema: unknown;
}

function skillsAsTools(skills: SkillRow[]) {
  return skills.map((s) => ({
    type: "function" as const,
    function: {
      name: `skill_${s.name}`,
      description: `[Skill aprendido] ${s.description}`,
      parameters:
        (s.params_schema as Record<string, unknown>) ?? {
          type: "object",
          properties: {},
        },
    },
  }));
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: ChatInput): ChatInput => {
    if (!input || typeof input !== "object") throw new Error("Payload inválido");
    if (!Array.isArray(input.messages) || input.messages.length === 0)
      throw new Error("Sin mensajes");
    if (input.messages.length > 50) throw new Error("Demasiados mensajes");
    for (const m of input.messages) {
      if (!["user", "assistant"].includes(m.role)) throw new Error("Rol inválido");
      if (typeof m.content !== "string" || m.content.length === 0 || m.content.length > 4000)
        throw new Error("Mensaje inválido");
    }
    if (input.userName != null && (typeof input.userName !== "string" || input.userName.length > 60))
      throw new Error("Nombre inválido");
    if (!Array.isArray(input.notes) || input.notes.length > 50) throw new Error("Notas inválidas");
    for (const n of input.notes) {
      if (typeof n !== "string" || n.length > 500) throw new Error("Nota inválida");
    }
    if (!["NEVIRA", "NOVA"].includes(input.themeName)) throw new Error("Tema inválido");
    return input;
  })
  .handler(async ({ data, context }): Promise<ChatResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { text: "", trace: [], error: "LOVABLE_API_KEY no configurada." };
    }

    // Cargar skills habilitados del usuario.
    const { supabase, userId } = context;
    const { data: skillRows } = await supabase
      .from("agent_skills")
      .select("id,name,description,code,params_schema")
      .eq("user_id", userId)
      .eq("enabled", true)
      .limit(40);
    const skills: SkillRow[] = (skillRows as SkillRow[]) ?? [];

    const callName = data.userName
      ? `el usuario se llama ${data.userName} y prefiere que lo llames así`
      : "aún no sabes el nombre del usuario";
    const memoryBlock =
      data.notes.length > 0
        ? `\nMEMORIA del usuario:\n- ${data.notes.join("\n- ")}`
        : "";
    const skillsBlock =
      skills.length > 0
        ? `\nSKILLS APRENDIDOS (puedes invocarlos como skill_<nombre>):\n${skills
            .map((s) => `- skill_${s.name}: ${s.description}`)
            .join("\n")}`
        : "";

    const systemPrompt = `Eres ${data.themeName}, asistente personal cálida, ingeniosa y atenta. Hablas español. ${callName}.

ESTILO:
- Lee el ánimo y adapta el tono. Markdown limpio. Sé directa.
- Si el usuario te pide algo para lo que no tienes una herramienta hecha, usa run_code para resolverlo. Si la solución es genéricamente útil, guárdala con save_skill.
- web_search SOLO para información actual o desconocida. NO para cálculos.
- Si una operación falla, intenta otra forma o explica qué pasó.${memoryBlock}${skillsBlock}`;

    const tools = [...TOOLS, ...skillsAsTools(skills)];
    const trace: AgentTrace[] = [];

    const conversation: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...data.messages,
    ];

    const model = routeModel(data.messages);

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: conversation, tools, tool_choice: "auto" }),
      });
      if (res.status === 429)
        return { text: "", trace, error: "Demasiadas peticiones. Espera un momento." };
      if (res.status === 402)
        return { text: "", trace, error: "Sin créditos de IA. Añade fondos en Settings → Workspace → Usage." };
      if (!res.ok) {
        console.error("AI gateway error", res.status, await res.text());
        return { text: "", trace, error: "No pude conectarme con la IA." };
      }
      const json = await res.json();
      const msg = json.choices?.[0]?.message;
      if (!msg) return { text: "", trace, error: "Respuesta vacía" };

      const toolCalls = msg.tool_calls as ChatMessage["tool_calls"];
      if (!toolCalls || toolCalls.length === 0) {
        return { text: msg.content ?? "", trace, error: null };
      }

      // Persistir el assistant con tool_calls
      conversation.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: toolCalls,
      });

      // Ejecutar cada tool call
      for (const call of toolCalls) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }
        let toolResult: unknown;
        let ok = true;
        let summary = "";

        try {
          if (call.function.name === "web_search") {
            const q = String(parsedArgs.query ?? "");
            const r = await doWebSearch(q);
            toolResult = r;
            ok = !r.error;
            summary = `🔎 "${q}" → ${r.results.length} resultados`;
          } else if (call.function.name === "run_code") {
            const code = String(parsedArgs.code ?? "");
            const args = (parsedArgs.args as Record<string, unknown>) ?? {};
            const desc = String(parsedArgs.description ?? "código");
            const r = await execSandbox(code, args);
            toolResult = r;
            ok = r.ok;
            summary = `⚙️ ${desc} → ${r.ok ? JSON.stringify(r.result).slice(0, 80) : `error: ${r.error}`}`;
          } else if (call.function.name === "save_skill") {
            const name = String(parsedArgs.name ?? "");
            const description = String(parsedArgs.description ?? "");
            const code = String(parsedArgs.code ?? "");
            const params_schema = (parsedArgs.params_schema as Record<string, unknown>) ?? {};
            if (!/^[a-z][a-z0-9_]{1,40}$/.test(name)) {
              toolResult = { error: "Nombre inválido (snake_case)" };
              ok = false;
              summary = `💾 save_skill rechazado: nombre inválido`;
            } else if (description.length < 5 || code.length < 5) {
              toolResult = { error: "description y code requeridos" };
              ok = false;
              summary = `💾 save_skill rechazado: faltan campos`;
            } else {
              const { error } = await supabase.from("agent_skills").upsert(
                {
                  user_id: userId,
                  name,
                  description,
                  code,
                  params_schema: params_schema as never,
                  enabled: true,
                },
                { onConflict: "user_id,name" },
              );
              if (error) {
                toolResult = { error: error.message };
                ok = false;
                summary = `💾 save_skill error`;
              } else {
                toolResult = { ok: true, name };
                summary = `💾 Skill "${name}" guardado`;
              }
            }
          } else if (call.function.name.startsWith("skill_")) {
            const skillName = call.function.name.slice("skill_".length);
            const skill = skills.find((s) => s.name === skillName);
            if (!skill) {
              toolResult = { error: "Skill no encontrado" };
              ok = false;
              summary = `🧠 skill_${skillName} no existe`;
            } else {
              const r = await execSandbox(skill.code, parsedArgs);
              toolResult = r;
              ok = r.ok;
              summary = `🧠 skill_${skillName} → ${r.ok ? JSON.stringify(r.result).slice(0, 80) : `error: ${r.error}`}`;
              // Bump usage
              await supabase
                .from("agent_skills")
                .update({
                  usage_count: ((skill as unknown as { usage_count?: number }).usage_count ?? 0) + 1,
                  last_used_at: new Date().toISOString(),
                })
                .eq("id", skill.id);
            }
          } else {
            toolResult = { error: "Tool desconocida" };
            ok = false;
            summary = `❓ tool ${call.function.name} desconocida`;
          }
        } catch (e) {
          toolResult = { error: e instanceof Error ? e.message : "Error" };
          ok = false;
          summary = `⚠️ ${call.function.name} falló`;
        }

        trace.push({ tool: call.function.name, args: parsedArgs, ok, summary });
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(toolResult).slice(0, 4000),
        });
      }
    }

    return {
      text: "Lo intenté varias veces pero no llegué a una respuesta clara. ¿Puedes reformularlo?",
      trace,
      error: null,
    };
  });
