import { createServerFn } from "@tanstack/react-start";
import { withSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten";
import variant from "@jitl/quickjs-singlefile-mjs-release-sync";

interface SandboxInput {
  code: string;
  args?: Record<string, unknown>;
}

interface SandboxResult {
  ok: boolean;
  result: unknown;
  logs: string[];
  error: string | null;
  ms: number;
}

const MAX_CODE = 8000;
const TIMEOUT_MS = 3000;
const MAX_LOG_LINES = 50;

let qjsModulePromise: ReturnType<typeof newQuickJSWASMModuleFromVariant> | null = null;
function getQjs() {
  if (!qjsModulePromise) qjsModulePromise = newQuickJSWASMModuleFromVariant(variant);
  return qjsModulePromise;
}

/**
 * Ejecuta JS arbitrario en una VM QuickJS (WASM) totalmente aislada.
 * Sin acceso a fetch, process, env, fs, BD, ni a ningún global del host.
 * El código debe terminar con una expresión que se devuelve como `result`.
 *
 * Globales disponibles dentro del sandbox: Math, JSON, Date, String, Number,
 * Array, Object, Boolean, RegExp, parseInt, parseFloat, console.log,
 * y un objeto `args` con los argumentos pasados.
 */
export const runSandbox = createServerFn({ method: "POST" })
  .middleware([withSupabaseAuth])
  .inputValidator((input: SandboxInput): SandboxInput => {
    if (!input || typeof input !== "object") throw new Error("Payload inválido");
    if (typeof input.code !== "string" || input.code.length === 0 || input.code.length > MAX_CODE) {
      throw new Error("Código inválido o demasiado largo");
    }
    if (input.args != null && typeof input.args !== "object") {
      throw new Error("args inválido");
    }
    return input;
  })
  .handler(async ({ data }): Promise<SandboxResult> => {
    const start = Date.now();
    const logs: string[] = [];

    let qjs;
    try {
      qjs = await getQjs();
    } catch (e) {
      console.error("QuickJS init error", e);
      return {
        ok: false,
        result: null,
        logs,
        error: "Sandbox no disponible",
        ms: Date.now() - start,
      };
    }

    const vm = qjs.newContext();
    let deadline = false;
    vm.runtime.setInterruptHandler(() => {
      if (Date.now() - start > TIMEOUT_MS) {
        deadline = true;
        return true;
      }
      return false;
    });
    vm.runtime.setMemoryLimit(10 * 1024 * 1024);

    try {
      // Inject console.log
      const consoleObj = vm.newObject();
      const logFn = vm.newFunction("log", (...args) => {
        if (logs.length >= MAX_LOG_LINES) return vm.undefined;
        const parts = args.map((a) => {
          try {
            const v = vm.dump(a);
            return typeof v === "string" ? v : JSON.stringify(v);
          } catch {
            return "[unserializable]";
          }
        });
        logs.push(parts.join(" "));
        return vm.undefined;
      });
      vm.setProp(consoleObj, "log", logFn);
      vm.setProp(vm.global, "console", consoleObj);
      logFn.dispose();
      consoleObj.dispose();

      // Inject args
      const argsHandle = vm.newString(JSON.stringify(data.args ?? {}));
      vm.setProp(vm.global, "__argsJson", argsHandle);
      argsHandle.dispose();
      const setupRes = vm.evalCode("globalThis.args = JSON.parse(__argsJson); delete globalThis.__argsJson;");
      if (setupRes.error) setupRes.error.dispose();
      else setupRes.value.dispose();

      // Wrap user code so the LAST expression is returned even if no `return`.
      const wrapped = `(function(){ ${data.code}\n})()`;
      const evalRes = vm.evalCode(wrapped);
      if (evalRes.error) {
        const errVal = vm.dump(evalRes.error);
        evalRes.error.dispose();
        return {
          ok: false,
          result: null,
          logs,
          error: deadline ? "Timeout (3s)" : String(errVal?.message ?? errVal ?? "Error"),
          ms: Date.now() - start,
        };
      }
      const value = vm.dump(evalRes.value);
      evalRes.value.dispose();
      return {
        ok: true,
        result: value,
        logs,
        error: null,
        ms: Date.now() - start,
      };
    } catch (e) {
      return {
        ok: false,
        result: null,
        logs,
        error: deadline ? "Timeout (3s)" : (e instanceof Error ? e.message : String(e)),
        ms: Date.now() - start,
      };
    } finally {
      vm.dispose();
    }
  });
