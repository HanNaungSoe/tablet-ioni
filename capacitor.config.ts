import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tkks.gic.tablet',
  appName: 'TKKS',
  webDir: 'www',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: {
    url: 'https://www.github.com',
    cleartext: true,
    androidScheme: 'http',
    iosScheme: 'http',
    allowNavigation: ['http://localhost:*', 'http://172.16.205.197:8080'],
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
  },
  ios: {
    scheme: 'GenexusApp',
    scrollEnabled: true,
    overrideUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
  },
};

export default config;
