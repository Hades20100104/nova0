import { createFileRoute, Outlet } from "@tanstack/react-router";

// Auth gate disabled — acceso libre sin inicio de sesión.
export const Route = createFileRoute("/_authenticated")({
  component: () => <Outlet />,
});
