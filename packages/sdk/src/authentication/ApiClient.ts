// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosStatic } from "axios";
import { IAuthProvider } from "./IAuthProvider";

// Initializes a new axios instance to call API
// Usage:
// const kudosClient = createApiClient("kudos_api_endpoint", new MyAuthProvider(param1, param2, ...));
// const kudosResult = await kudosClient.get("kudos_api_name");
export function createApiClient(apiEndpoint: string, authProvider: IAuthProvider): AxiosStatic {
  // Add a request interceptor
  axios.interceptors.request.use(
    async function (config) {
      config.url = apiEndpoint;
      await authProvider.ConfigureAxiosRequestWithAuthenticationInfo(config);
      return config;
    },
    function (error) {
      return Promise.reject(error);
    }
  );
  return axios;
}
