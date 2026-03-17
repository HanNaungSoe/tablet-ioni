# Technical Documentation

## 1. Project Overview

`tablet-ioni` is an Ionic + Angular tablet application wrapped by Capacitor for Android.  
The app launches a remote GeneXus web application inside a native in-app web view and sends device metadata (`deviceId`, `manufacturer`) to a backend endpoint.

Primary stack:
- Angular 20
- Ionic 8
- Capacitor 7 (Android)
- Capacitor InAppBrowser plugin

## 2. High-Level Architecture

Application flow:
1. App starts and routes to `HomePage`.
2. Device/network checks run in `HomePage`.
3. Device ID and device info are read through Capacitor Device plugin.
4. Metadata is posted to backend via `GenexusService`.
5. Remote website URL is opened in Capacitor InAppBrowser WebView.

Key source files:
- `src/app/home/home.page.ts`: startup logic, connectivity alert, open webview
- `src/app/services/device.ts`: wraps `@capacitor/device`
- `src/app/services/genexus.ts`: backend POST call
- `src/environments/environment.ts`: dev endpoint URLs
- `src/environments/environment.prod.ts`: production endpoint URLs
- `capacitor.config.ts`: Capacitor runtime/server/native options

## 3. Directory Structure

Main folders:
- `src/`: Angular/Ionic source code
- `android/`: Native Android project generated/synced by Capacitor
- `www/`: Angular build output consumed by Capacitor
- `resources/`: app icon/splash source assets

Important config files:
- `package.json`: scripts and dependencies
- `angular.json`: build and serve config (`www` output, proxy, environments)
- `capacitor.config.ts`: app id/name, server URL, plugin settings
- `proxy.conf.json`: local dev proxy
- `ionic.config.json`: Ionic CLI project settings

## 4. Runtime Behavior

`HomePage` responsibilities:
- Wait for platform ready (`Platform.ready()`).
- Detect offline state and show alert (`presentOfflineAlert`).
- Collect device details:
  - `DeviceService.getDeviceId()`
  - `DeviceService.getDeviceInfo()`
- Send metadata using `GenexusService.sendData(id, manufacturer)`.
- Open the target URL via:
  - `InAppBrowser.openInWebView({ url, options })`

InAppBrowser options include:
- toolbar visible
- URL bar visible
- navigation buttons
- Android hardware back support
- iOS full-screen style and gesture navigation

## 5. Networking and Endpoints

Configured endpoints are currently hardcoded in environment files and Capacitor server config:
- Dev/Prod `apiUrl` and `websiteUrl` in `src/environments/*.ts`
- Capacitor `server.url` in `capacitor.config.ts`

Notes:
- URLs are currently internal/private IP endpoints (`192.168.x.x`), so app behavior depends on network reachability.
- Android manifest enables cleartext traffic (`android:usesCleartextTraffic="true"`), allowing HTTP.
- Dev proxy (`proxy.conf.json`) maps `/gx` to a backend host for local development.

## 6. Build and Run

## 6.1 Prerequisites
- Node.js LTS 20.19
- npm
- Ionic CLI
- Android Studio + SDK (for Android build/run)

## 6.2 Install dependencies
```bash
npm install
```

## 6.3 Web development
```bash
npm start
 (or)
npx ionic serve
```
Equivalent to `ng serve` (uses `proxy.conf.json` from Angular serve options).

## 6.4 Production web build
```bash
npm run build
```
Output is generated in `www/`.

## 6.5 Sync and run Android
```bash
npx cap sync android
npx cap open android
```
Then build/run from Android Studio, or:
```bash
npx cap run android
```

## 7. Environment Management

Angular file replacement:
- Default build uses production configuration (`angular.json`).
- `environment.ts` is replaced by `environment.prod.ts` in production builds.

Current setup duplicates endpoint values in multiple places:
- `environment.*.ts`
- `capacitor.config.ts`
- `proxy.conf.json`

Recommendation:
- Keep a single source of truth for base URLs where possible.
- Document environment values for DEV/UAT/PROD in a separate deployment config table.

## 8. Native Android Notes

From `AndroidManifest.xml`:
- `INTERNET` and `ACCESS_NETWORK_STATE` permissions enabled.
- `network_security_config.xml` is referenced.
- Cleartext traffic enabled for HTTP endpoints.

Operational impact:
- App can call non-HTTPS internal endpoints.
- Device must be in network that can resolve/reach backend host/IP.

## 9. Testing and Quality

Available scripts:
- `npm test`: unit tests (Karma/Jasmine)
- `npm run lint`: ESLint

Current status observations:
- Basic service/page spec files exist.
- No explicit e2e test setup in repository.

Recommended minimum CI checks:
1. `npm run lint`
2. `npm test -- --watch=false --browsers=ChromeHeadless`
3. `npm run build`

## 10. Known Risks and Improvements

1. Hardcoded private IP endpoints reduce portability across environments.
2. HTTP endpoints + cleartext increase security risk in production.
3. Business-critical startup logic is in one page (`HomePage`) and could be refactored into an app initialization service.
4. `sendData` API request has limited error handling/retry strategy.
5. Commented legacy code in `home.page.ts` can be cleaned to improve maintainability.

## 11. Suggested Next Refactor Steps

1. Add environment profiles (`dev`, `uat`, `prod`) with explicit documentation.
2. Move startup orchestration from `HomePage` into `AppInitService`.
3. Add structured logging for startup and API failures.
4. Add integration tests for device metadata submission and webview launch behavior.
5. Enforce HTTPS + certificate strategy for non-local deployments.
