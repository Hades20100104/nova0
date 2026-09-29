# Empaquetado nativo (Capacitor + Electron)

Los shells nativos cargan la app publicada en `https://nova0.lovable.app`,
así que **no necesitas reempaquetar cada vez que cambias el código** — solo
republica desde Lovable y la app móvil/escritorio recibe los cambios al
abrirse.

---

## 📱 Móvil (Android APK)

### Requisitos en tu máquina
- Node 20+ y `bun` (o `npm`)
- **Android Studio** instalado con SDK Android 34+
- Variable `ANDROID_HOME` apuntando al SDK
- Java JDK 17

### Pasos
```bash
# 1. Clona el repo (o descarga el zip desde Lovable → Code)
git clone <tu-repo>
cd <tu-repo>
bun install

# 2. Build web (genera dist/)
bun run build

# 3. Agrega plataforma Android (solo la primera vez)
bunx cap add android

# 4. Sincroniza assets + plugins nativos
bunx cap sync android

# 5. Compilar APK debug
cd android
./gradlew assembleDebug

# El APK queda en:
# android/app/build/outputs/apk/debug/app-debug.apk
```

Copia ese `app-debug.apk` a tu teléfono (USB, Drive, Telegram…) y ábrelo
para instalar. Activa "instalar de orígenes desconocidos" si es la primera vez.

### iOS (opcional, requiere Mac + Xcode)
```bash
bunx cap add ios
bunx cap sync ios
bunx cap open ios   # abre Xcode → Run en simulador o iPhone
```

### Permisos ya configurados
- **Geolocalización** (para automatizaciones por geocerca)
- **Notificaciones locales** (para acción "Mostrar notificación")
- Splash screen oscuro

---

## 💻 Escritorio (Windows / macOS / Linux)

### Instalar dependencias de empaquetado
```bash
bun add -d electron @electron/packager
```

### Empaquetar
```bash
# Linux
bunx @electron/packager . "Nova" \
  --platform=linux --arch=x64 \
  --out=electron-release --overwrite \
  --ignore="^/src" --ignore="^/public" --ignore="^/electron-release" \
  --ignore="^/android" --ignore="^/ios"

# Windows (cross-compile desde cualquier OS)
bunx @electron/packager . "Nova" \
  --platform=win32 --arch=x64 \
  --out=electron-release --overwrite

# macOS
bunx @electron/packager . "Nova" \
  --platform=darwin --arch=arm64 \
  --out=electron-release --overwrite
```

El binario queda en `electron-release/Nova-<plataforma>-<arch>/`. Para Linux
ejecuta `./Nova`, para Windows `Nova.exe`, para macOS abre `Nova.app`.

### Para correr sin empaquetar (modo dev)
```bash
bunx electron electron/main.cjs
```

---

## Cambiar a desarrollo local

Si quieres que el shell apunte a tu sandbox o a localhost en lugar de a
producción, edita:
- **Móvil**: `capacitor.config.ts` → `server.url` → `http://TU_IP:8080`
  (y pon `cleartext: true` si es http)
- **Escritorio**: `electron/main.cjs` → `PUBLISHED_URL`

Luego en Capacitor: `bunx cap sync` para que el cambio llegue al APK.
