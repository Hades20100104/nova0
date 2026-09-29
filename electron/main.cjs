// Electron main process — abre el shell de escritorio cargando la app publicada.
// Usa CommonJS (.cjs) porque package.json tiene "type": "module".
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const PUBLISHED_URL = "https://nova0.lovable.app";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: "#0b0b14",
    title: "Nova",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Abrir links externos en el navegador, no en la ventana.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(PUBLISHED_URL)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void win.loadURL(PUBLISHED_URL);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
