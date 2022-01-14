// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const clientId = "fake_client_id";
export const tenantId = "fake_tenant_id";
export const authorityHost = "fake_authority_host";
export const initiateLoginEndpoint = "https://fake_login_url";
export const applicationIdUri = "fake_application_id";
export const apiEndpoint = "fake_api_endpoint";

export function MockBrowserEnvironment(): void {
  const env = (window as any).__env__;
  env.REACT_APP_AUTHORITY_HOST = authorityHost;
  env.REACT_APP_TENANT_ID = tenantId;
  env.REACT_APP_CLIENT_ID = clientId;
  env.REACT_APP_START_LOGIN_PAGE_URL = initiateLoginEndpoint;
  env.M365_APPLICATION_ID_URI = applicationIdUri;
  env.REACT_APP_FUNC_ENDPOINT = apiEndpoint;
}

export function RestoreBrowserEnvironment(): void {
  const env = (window as any).__env__;
  env.REACT_APP_AUTHORITY_HOST = undefined;
  env.REACT_APP_TENANT_ID = undefined;
  env.REACT_APP_CLIENT_ID = undefined;
  env.REACT_APP_START_LOGIN_PAGE_URL = undefined;
  env.M365_APPLICATION_ID_URI = undefined;
  env.REACT_APP_FUNC_ENDPOINT = undefined;
}
