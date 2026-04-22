import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tkks.gic.tablet.old',
  appName: 'Old-TKKS',
  webDir: 'www',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: {
    // url: 'http://172.16.205.197:8080/DeploymentUnit2_20260224215411/com.testing.adevice_login',
    cleartext: true,
    androidScheme: 'http',
    iosScheme: 'http',
    allowNavigation: [
      'http://localhost:*', 
      'http://192.168.1.5:8080', 
      'http://122.103.187.60',
      'https://system.tkks.co.jp',
    ],
  },
  android: {
    allowMixedContent: true,
    loggingBehavior: 'none',
    webContentsDebuggingEnabled: false,
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
  },
  ios: {
    scheme: 'GenexusApp',
    scrollEnabled: true,
    overrideUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
  },
};

export default config;
