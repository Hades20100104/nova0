import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for Nova / Nevira mobile shell.
 * El servidor apunta a la URL publicada en Lovable, así heredamos auth,
 * server functions, Spotify y demás sin recompilar la app cada cambio.
 *
 * Para desarrollo local apuntando al sandbox, comenta `url` o cámbialo
 * a tu IP local + puerto 8080.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.nova",
  appName: "Nova",
  webDir: "dist",
  server: {
    url: "https://nova0.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0b0b14",
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#7c3aed",
    },
  },
};

export default config;
