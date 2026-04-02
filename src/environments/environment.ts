// Change this one value when you want to point the app to a different backend
// (e.g. your laptop IP for client demos: 'http://192.168.1.50:8080').
const BACKEND_ORIGIN = 'http://192.168.1.5:8080';
// const BACKEND_ORIGIN = 'http://192.168.1.3:8080';
// const BACKEND_ORIGIN = 'https://122.103.187.60';
const BACKEND_PATH = 'DeploymentUnit1_20260331111515';
// const BACKEND_PATH = 'tkz_gx18u10_wwp1534JavaPostgreSQL';
const GENEXUS_OBJECT_PREFIX = 'com.tkzgx18u10wwp1534new';
// const GENEXUS_OBJECT_PREFIX = 'com.tkzgx18u10wwp1534new';
const LOGIN_OBJECT_PREFIX = 'com.tkzgx18u10wwp1534new';

export const environment = {
  production: false,
  insecureSsl: true,

  // Web dev API: use Angular proxy (/gx -> proxy.conf.json target) to avoid CORS issues and allow easy switching between backends without changing code
  apiUrl: `/gx/${BACKEND_PATH}/${GENEXUS_OBJECT_PREFIX}.adevice_login`,
  loginApiUrl: `/gx/${BACKEND_PATH}/${LOGIN_OBJECT_PREFIX}.alogin_api`,
  // apiUrl: `${BACKEND_ORIGIN}/${BACKEND_PATH}/${GENEXUS_OBJECT_PREFIX}.adevice_login`,
  // loginApiUrl: `${BACKEND_ORIGIN}/${BACKEND_PATH}/${GENEXUS_OBJECT_PREFIX}.alogin_api`,
  // Default page to open in in-app browser
  websiteUrl: `${BACKEND_ORIGIN}/${BACKEND_PATH}/${GENEXUS_OBJECT_PREFIX}.adevice_login`,

};
