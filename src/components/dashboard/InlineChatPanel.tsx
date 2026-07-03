import { AssistantChat } from "@/components/AssistantChat";
import { X, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getModule } from "@/lib/modules";
import { getModuleChatConfig } from "@/lib/module-chat-config";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  assistant: "nova" | "nevira";
  threadId: string;
  module: string;
  onClose: () => void;
};

/**
 * Docked chat panel:
 * - Desktop: right-side drawer (420px). The section behind stays visible and interactive.
 * - Mobile: bottom sheet (70dvh) so users can still see the section above.
 * Adopts the section's accent color so it feels like part of the same room.
 */
export function InlineChatPanel({ assistant, threadId, module, onClose }: Props) {
  const isMobile = useIsMobile();
  const fullRoute = assistant === "nova" ? "/nova/$threadId" : "/nevira/$threadId";
  const moduleDef = getModule(assistant, module);
  const cfg = getModuleChatConfig(assistant, module);
  const Icon = moduleDef.icon;

  const sendChip = (text: string) => {
    window.dispatchEvent(
      new CustomEvent("assistant:send", { detail: { threadId, text } }),
    );
  };

  const dockStyle: React.CSSProperties = isMobile
    ? {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "72dvh",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTop: `1px solid color-mix(in oklab, ${cfg.accent} 35%, transparent)`,
      }
    : {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "min(440px, 42vw)",
        borderLeft: `1px solid color-mix(in oklab, ${cfg.accent} 35%, transparent)`,
      };

  return (
    <>
      {/* Soft backdrop only on mobile so section is still visible on desktop */}
      {isMobile && (
        <button
          aria-label="Cerrar chat"
          onClick={onClose}
          className="absolute inset-0 z-20 bg-background/40 backdrop-blur-[2px] animate-fade-in"
        />
      )}

      <aside
        className="z-30 flex flex-col overflow-hidden animate-slide-in"
        style={{
          ...dockStyle,
          background: `linear-gradient(180deg, color-mix(in oklab, ${cfg.accent} 8%, transparent), color-mix(in oklab, var(--background) 94%, transparent))`,
          backdropFilter: "blur(22px)",
          boxShadow: `-24px 0 60px -20px color-mix(in oklab, ${cfg.accent} 40%, transparent)`,
        }}
      >
        {/* Themed header (matches the section) */}
        <div
          className="relative flex items-center justify-between gap-3 px-4 py-3 border-b"
          style={{
            borderColor: `color-mix(in oklab, ${cfg.accent} 30%, transparent)`,
            background: `linear-gradient(90deg, color-mix(in oklab, ${cfg.accent} 22%, transparent), transparent 70%)`,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent2})`,
                boxShadow: `0 0 24px color-mix(in oklab, ${cfg.accent} 55%, transparent)`,
              }}
            >
              <Icon className="h-4 w-4 text-background" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.35em] text-muted-foreground font-mono">
                {assistant.toUpperCase()} · {cfg.tag}
              </div>
              <div className="font-display text-sm truncate">
                {cfg.title ?? moduleDef.label}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={fullRoute}
              params={{ threadId }}
              className="grid h-8 w-8 place-items-center rounded-lg border transition"
              style={{
                borderColor: `color-mix(in oklab, ${cfg.accent} 40%, transparent)`,
                background: `color-mix(in oklab, ${cfg.accent} 10%, transparent)`,
              }}
              title="Abrir vista completa"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg border transition"
              style={{
                borderColor: `color-mix(in oklab, ${cfg.accent} 40%, transparent)`,
                background: `color-mix(in oklab, ${cfg.accent} 10%, transparent)`,
              }}
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick-action chips */}
        {cfg.chips.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 border-b border-border/30 scrollbar-none">
            <Sparkles className="h-3 w-3 shrink-0 text-muted-foreground" />
            {cfg.chips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => sendChip(chip.prompt)}
                className="shrink-0 rounded-full px-3 py-1 text-[11px] font-medium border transition hover:scale-[1.02]"
                style={{
                  borderColor: `color-mix(in oklab, ${cfg.accent} 45%, transparent)`,
                  background: `color-mix(in oklab, ${cfg.accent} 12%, transparent)`,
                  color: `color-mix(in oklab, ${cfg.accent} 90%, white)`,
                }}
                title={chip.prompt}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0">
          <AssistantChat
            assistant={assistant}
            threadId={threadId}
            module={module}
            initialMessages={[]}
          />
        </div>
      </aside>
    </>
  );
}
