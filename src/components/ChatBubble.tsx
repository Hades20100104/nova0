import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  time?: string;
}

interface ChatBubbleProps {
  message: ChatMessage;
  themeName: "NEVIRA" | "NOVA";
}

/**
 * Renderizado simple de markdown (negritas, líneas).
 * Mantenemos esto inline para no añadir más dependencias en la fase 1.
 */
function renderInline(text: string) {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatBubble({ message, themeName }: ChatBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full animate-float-up", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-card",
          isUser
            ? "bg-gradient-to-br from-primary/30 to-primary-glow/20 border border-primary/40 text-foreground"
            : "glass",
        )}
      >
        {!isUser && (
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold tracking-widest text-primary">{themeName}</span>
            {message.time && (
              <span className="text-[10px] text-muted-foreground">{message.time}</span>
            )}
          </div>
        )}
        <div className="whitespace-pre-wrap leading-relaxed">
          {message.content.split("\n").map((line, i) => (
            <p key={i} className={cn(i > 0 && "mt-2")}>
              {renderInline(line)}
            </p>
          ))}
        </div>
        {isUser && message.time && (
          <div className="mt-1 text-right text-[10px] text-muted-foreground">{message.time}</div>
        )}
      </div>
    </div>
  );
}
