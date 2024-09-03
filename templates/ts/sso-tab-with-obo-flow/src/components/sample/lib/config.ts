const config = {
  initiateLoginEndpoint: import.meta.env.VITE_APP_START_LOGIN_PAGE_URL,
  clientId: import.meta.env.VITE_APP_CLIENT_ID,
  apiEndpoint: import.meta.env.VITE_APP_FUNC_ENDPOINT,
  apiName: import.meta.env.VITE_APP_FUNC_NAME,
};

export default config;
