/**
 * Detección de runtime nativo (Capacitor) y helpers específicos.
 *
 * Importante: este módulo se carga también en web. Usamos imports dinámicos
 * para que los plugins de Capacitor no rompan el bundle en navegador y solo
 * se carguen cuando realmente estamos dentro del shell nativo.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

export function getPlatform(): "web" | "ios" | "android" {
  if (typeof window === "undefined") return "web";
  const p = window.Capacitor?.getPlatform?.() ?? "web";
  return (p === "ios" || p === "android" ? p : "web") as "web" | "ios" | "android";
}

/** Solicita permiso de geolocalización nativo si estamos en móvil. */
export async function requestNativeGeoPermission(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.requestPermissions();
    return status.location === "granted" || status.coarseLocation === "granted";
  } catch (e) {
    console.warn("native geo permission", e);
    return false;
  }
}

/** Obtiene posición usando el plugin nativo en móvil, fallback a navigator. */
export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (isNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      console.warn("native getCurrentPosition", e);
      return null;
    }
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 },
    );
  });
}

/** Dispara una notificación local en el dispositivo (móvil) o un toast (web). */
export async function notifyLocal(title: string, body: string) {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1_000_000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
      return;
    } catch (e) {
      console.warn("native notify", e);
    }
  }
  // Web: dejamos que el caller use sonner toast.
}

/** Configura status bar y oculta splash una vez la app monta. */
export async function initNativeShell() {
  if (!isNative()) return;
  try {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
    ]);
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    await SplashScreen.hide().catch(() => {});
  } catch (e) {
    console.warn("initNativeShell", e);
  }
}
