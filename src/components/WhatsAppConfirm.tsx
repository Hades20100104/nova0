import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";

interface WhatsAppConfirmProps {
  phone: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WhatsAppConfirm({ phone, message, onConfirm, onCancel }: WhatsAppConfirmProps) {
  return (
    <div className="rounded-2xl border border-primary/40 bg-card/70 p-4 backdrop-blur shadow-glow space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircle className="h-4 w-4 text-[#25D366]" />
        Enviar WhatsApp
      </div>
      <div className="space-y-1 text-sm">
        <div><span className="text-muted-foreground">Para: </span><span className="font-mono">{phone}</span></div>
        <div className="rounded-lg border border-border bg-background/60 p-2.5 text-sm">
          “{message}”
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          <X className="mr-1 h-3.5 w-3.5" /> Cancelar
        </Button>
        <Button size="sm" className="flex-1 bg-[#25D366] text-white hover:bg-[#1ebe57]" onClick={onConfirm}>
          <MessageCircle className="mr-1 h-3.5 w-3.5" /> Abrir WhatsApp
        </Button>
      </div>
    </div>
  );
}
