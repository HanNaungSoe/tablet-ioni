# Tablet Ionic (This Branch)

Ionic/Angular tablet app that checks device identity, calls the Genexus backend, and opens the returned URL inside an in?app webview.

## Key Behavior
- On app start, `AppInitService` sends device ID + manufacturer to the backend.
- If the device is allowed, it opens the returned URL in `@capgo/inappbrowser`.
- If not allowed, it routes to `/not-found`.
- Home screen includes pull?to?refresh and a manual reload button.

## Tech Stack
- Angular 20.3.x
- Ionic 8
- Capacitor 7
- Capgo InAppBrowser (`@capgo/inappbrowser`)
- Capacitor Network (`@capacitor/network`)
- Cordova Advanced HTTP (`cordova-plugin-advanced-http`)

## Setup
```bash
npm install
```

### Development (web)
```bash
npm run start
```
If you need the proxy:
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
- `apiUrl`: device login endpoint.
- `websiteUrl`: base URL for redirect resolution.
- `loginUrl`: login page opened after device check.
- `insecureSsl`: set `true` to ignore invalid certs in the webview.

Capacitor settings live in `capacitor.config.ts`.

## Not Found Handling
The Not Found screen provides a `Go Back Home` button that navigates to `/home` and skips device re?checking on that single navigation.

## Icons
```bash
npx @capacitor/assets generate
npx cap sync android
```

## Useful Files
- `src/app/services/app-init.service.ts` ? device check + webview open.
- `src/app/services/device.ts` ? device info/id.
- `src/app/services/genexus.ts` ? backend call.
- `src/app/home/` ? home UI.
