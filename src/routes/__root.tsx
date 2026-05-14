import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { initNativeShell } from "@/lib/native";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NEVIRA & NOVA — Asistente personal con IA" },
      {
        name: "description",
        content:
          "Asistente personal con IA: música por voz, imágenes IA, documentos Word/Excel/PowerPoint, WhatsApp y automatizaciones por hora o ubicación.",
      },
      { name: "author", content: "NEVIRA & NOVA" },
      { property: "og:site_name", content: "NEVIRA & NOVA" },
      { property: "og:title", content: "NEVIRA & NOVA — Asistente personal con IA" },
      {
        property: "og:description",
        content:
          "Música, imágenes IA, documentos y automatizaciones por voz. Dos modos: NEVIRA (día) y NOVA (noche).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "NEVIRA & NOVA — Asistente personal con IA" },
      {
        name: "twitter:description",
        content:
          "Música, imágenes IA, documentos y automatizaciones por voz. Dos modos: NEVIRA (día) y NOVA (noche).",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8ea53b5b-761e-49cf-8307-ee472d10c2b9/id-preview-3ee84c3b--c6adccff-6ecc-43e5-8d96-e24abc2e8af5.lovable.app-1776966617733.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8ea53b5b-761e-49cf-8307-ee472d10c2b9/id-preview-3ee84c3b--c6adccff-6ecc-43e5-8d96-e24abc2e8af5.lovable.app-1776966617733.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    void initNativeShell();
  }, []);
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-center" />
    </>
  );
}
