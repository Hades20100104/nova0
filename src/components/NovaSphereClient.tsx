import { lazy, Suspense } from "react";
import { useHydrated } from "@tanstack/react-router";

const NovaSphere = lazy(() =>
  import("@/components/NovaSphere").then((module) => ({ default: module.NovaSphere })),
);

function NovaSphereFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_38%),#06030f]">
      <div className="relative h-64 w-64 rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_90px_var(--glow)]">
        <div className="absolute inset-8 rounded-full bg-primary/20 blur-2xl" />
        <div className="absolute inset-16 rounded-full bg-foreground/80 blur-xl" />
      </div>
    </div>
  );
}

export function NovaSphereClient(props: { onSelect: (slug: string) => void; active: string }) {
  const hydrated = useHydrated();

  if (!hydrated) return <NovaSphereFallback />;

  return (
    <Suspense fallback={<NovaSphereFallback />}>
      <NovaSphere {...props} />
    </Suspense>
  );
}