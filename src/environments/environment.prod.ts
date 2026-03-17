// Change this one value when you want to point the app to a different backend
// (e.g. your laptop IP for client demos: 'http://192.168.1.50:8080').
const BACKEND_ORIGIN = 'https://122.103.187.60';

export const environment = {
  production: true,
  insecureSsl: true,

  // For device/app builds use absolute backend URL (no Angular proxy on device):
  apiUrl: `${BACKEND_ORIGIN}/tkz_gx18u10_wwp1534JavaPostgreSQL/com.tkzgx18u10wwp1534.adevice_login`,

  // Default page to open in in-app browser
  websiteUrl: `${BACKEND_ORIGIN}/tkz_gx18u10_wwp1534JavaPostgreSQL/com.tkzgx18u10wwp1534.adevice_login`,

  // Login page to open (used by AppInitService.initialize)
  loginUrl: `${BACKEND_ORIGIN}/tkz_gx18u10_wwp1534JavaPostgreSQL/com.tkzgx18u10wwp1534.z101_wp01_login`,
};
