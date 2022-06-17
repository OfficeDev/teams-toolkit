// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import { AuthProvider } from "./authProvider";

/**
 * Initializes new Axios instance with specific auth provider
 *
 * @param apiEndpoint - Base url of the API
 * @param authProvider - Auth provider that injects authentication info to each request
 * @returns axios instance configured with specfic auth provider
 *
 * @example
 * ```typescript
 * const client = createApiClient("https://my-api-endpoint-base-url", new BasicAuthProvider("xxx","xxx"));
 * ```
 */
export function createApiClient(apiEndpoint: string, authProvider: AuthProvider): AxiosInstance {
  // Add a request interceptor
  const instance = axios.create({
    baseURL: apiEndpoint,
  });
  instance.interceptors.request.use(async function (config) {
    return await authProvider.AddAuthenticationInfo(config);
  });
  return instance;
}
