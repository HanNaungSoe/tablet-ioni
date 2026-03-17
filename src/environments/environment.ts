// Change this one value when you want to point the app to a different backend
// (e.g. your laptop IP for client demos: 'http://192.168.1.50:8080').
const BACKEND_ORIGIN = 'https://122.103.187.60';

export const environment = {
  production: false,
  insecureSsl: true,

  // Web dev API: use Angular proxy (/gx -> proxy.conf.json target) to avoid CORS issues and allow easy switching between backends without changing code
  //development apiUrl: '/gx/tkz_gx18u10_wwp1534JavaPostgreSQL/com.tkzgx18u10wwp1534.adevice_login',
  apiUrl: '/gx/tkz_gx18u10_wwp1534JavaPostgreSQL/com.tkzgx18u10wwp1534.adevice_login',

  // Default page to open in in-app browser
  
  websiteUrl: `${BACKEND_ORIGIN}/tkz_gx18u10_wwp1534JavaPostgreSQL/com.tkzgx18u10wwp1534.adevice_login`,

  // Login page to open (used by AppInitService.initialize)
  loginUrl: `${BACKEND_ORIGIN}/tkz_gx18u10_wwp1534JavaPostgreSQL/com.tkzgx18u10wwp1534.z101_wp01_login`,
};
