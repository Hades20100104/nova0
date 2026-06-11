import { AssistantChat } from "@/components/AssistantChat";
import { X, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  assistant: "nova" | "nevira";
  threadId: string;
  module: string;
  onClose: () => void;
};

export function InlineChatPanel({ assistant, threadId, module, onClose }: Props) {
  const fullRoute = assistant === "nova" ? "/nova/$threadId" : "/nevira/$threadId";
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background/95 backdrop-blur-md animate-fade-in">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/40">
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">
          Chat en vivo · {assistant.toUpperCase()}
        </span>
        <div className="flex items-center gap-2">
          <Link
            to={fullRoute}
            params={{ threadId }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 transition"
            title="Abrir vista completa"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 transition"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <AssistantChat
        assistant={assistant}
        threadId={threadId}
        module={module}
        initialMessages={[]}
      />
    </div>
  );
}
