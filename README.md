# TKKS Tablet (Ionic + Angular)

Android tablet app built with Ionic/Angular and Capacitor. It loads a Genexus web app inside an in-app webview and sends device metadata to the backend on startup.

## Features
- Opens the configured website inside an in-app webview (`@capacitor/inappbrowser`).
- Sends device ID and manufacturer to the backend (`GenexusService`).
- Basic offline detection (browser events + native device info).
- Configurable backend URLs via `environment.ts` / `environment.prod.ts`.

## Tech Stack
- Angular 20
- Ionic 8
- Capacitor 7

## Requirements
- Node.js and npm
- Android Studio (for Android builds)

## Setup
```bash
npm install
```

### Development (web)
```bash
npm run start
or
npx ionic serve

```
If you need the dev proxy, run:
```bash
ng serve --proxy-config proxy.conf.json
```

### Android
```bash
npx cap sync android
npx cap open android
```

## Configuration
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Key values:
- `apiUrl`: backend endpoint used by `GenexusService`.
- `websiteUrl`: web app URL opened in the webview.

Capacitor settings:
- `capacitor.config.ts` configures app ID/name, HTTP settings, and dev server URL.

## Cleartext HTTP (Android)
If you use HTTP (not HTTPS), Android requires an allowlist:
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/xml/network_security_config.xml`

Add internal IPs there when needed.

## App Icon
1. Replace `resources/icon.png`.
2. Regenerate assets:
```bash
npx @capacitor/assets generate
```
3. Sync Android:
```bash
npx cap sync android
```

## Branches
Common branches in this repo:
- `main`
- `dev`
- `dev-tkks`
- `test`
- `test-advanced-http`

## Notes
- Home screen logic lives in `src/app/home/`.
- Device metadata collection is in `src/app/services/device.ts`.
- Backend calls are in `src/app/services/genexus.ts`.
