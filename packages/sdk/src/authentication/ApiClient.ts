// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosStatic } from "axios";
import { IAuthProvider } from "./IAuthProvider";

/**
 * Initializes new Axios instance with specific auth provider
 *
 * @param apiEndpoint - Base url of the API
 * @param authProvider - Auth provider that injects authentication info to each request
 * @returns axios instance configured with specfic auth provider
 *
 * @example
 * ```typescript
 * const client = createApiClient("https://kudos.microsoft.com/api", new BasicAuthProvider("xxx","xxx"));
 * ```
 */
export function createApiClient(apiEndpoint: string, authProvider: IAuthProvider): AxiosStatic {
  // Add a request interceptor
  axios.interceptors.request.use(
    async function (config) {
      config.url = apiEndpoint;
      await authProvider.AddAuthenticationInfo(config);
      return config;
    },
    function (error) {
      return Promise.reject(error);
    }
  );
  return axios;
}
