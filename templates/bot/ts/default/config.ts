const config = {
  botId: process.env.BOT_ID,
  botPassword: process.env.BOT_PASSWORD,
  clientId: process.env.M365_CLIENT_ID,
  clientSecret: process.env.M365_CLIENT_SECRET,
  tenantId: process.env.M365_TENANT_ID,
  authorityHost: process.env.M365_AUTHORITY_HOST,
  initiateLoginEndpoint: process.env.INITIATE_LOGIN_ENDPOINT,
  apiEndpoint: process.env.API_ENDPOINT,
  applicationIdUri: process.env.M365_APPLICATION_ID_URI,
};

export default config;
