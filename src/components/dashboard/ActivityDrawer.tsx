import { useState } from "react";
import { Activity } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RecentActivity } from "./RecentActivity";

export function ActivityDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 transition shrink-0"
        title="Actividad"
        aria-label="Abrir actividad reciente"
      >
        <Activity className="h-4 w-4" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[90vw] max-w-md overflow-y-auto border-l border-border/40">
          <SheetHeader>
            <SheetTitle className="font-display">Actividad</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{open && <RecentActivity />}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
