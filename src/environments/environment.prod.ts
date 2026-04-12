// Change this one value when you want to point the app to a different backend
// (e.g. your laptop IP for client demos: 'http://192.168.1.50:8080').
// const BACKEND_ORIGIN = 'http://192.168.1.5:8080';
const BACKEND_ORIGIN = 'https://system.tkks.co.jp';
// const BACKEND_ORIGIN = 'https://122.103.187.60';
// const BACKEND_PATH = 'DeploymentUnit1_20260331111515';
const BACKEND_PATH = 'tkz_gx18u10_wwp1534JavaPostgreSQL';
const GENEXUS_OBJECT_PREFIX = 'com.tkzgx18u10wwp1534';
// const GENEXUS_OBJECT_PREFIX = 'com.tkzgx18u10wwp1534';
const LOGIN_OBJECT_PREFIX = 'com.tkzgx18u10wwp1534';

export const environment = {
  production: true,
  insecureSsl: true,

  // For device/app builds use absolute backend URL (no Angular proxy on device):
  apiUrl: `${BACKEND_ORIGIN}/${BACKEND_PATH}/${GENEXUS_OBJECT_PREFIX}.adevice_login`,
  loginApiUrl: `${BACKEND_ORIGIN}/${BACKEND_PATH}/${LOGIN_OBJECT_PREFIX}.alogin_api`,
  registerApiUrl: `${BACKEND_ORIGIN}/${BACKEND_PATH}/${GENEXUS_OBJECT_PREFIX}.at127_devicerequest_api`,

  // Default page to open in in-app browser
  websiteUrl: `${BACKEND_ORIGIN}/${BACKEND_PATH}/${GENEXUS_OBJECT_PREFIX}.adevice_login`,

};
