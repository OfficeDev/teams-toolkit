// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosStatic } from "axios";
import { IAuthProvider } from "./IAuthProvider";

// Initializes a new axios instance to call API
export function createApiClient(apiEndpoint: string, authProvider: IAuthProvider): AxiosStatic {
  // Add a request interceptor
  axios.interceptors.request.use(
    async function (config) {
      config.url = apiEndpoint;

      await authProvider.configureAxiosRequest(config);

      // Do something before request is sent
      return config;
    },
    function (error) {
      // Do something with request error
      return Promise.reject(error);
    }
  );
  return axios;
}

// // Loads current app's configuration
// const teamsFx = new TeamsFx(IdentityType.User).setSsoToken("xxx"); // The SSO token is required to call function with OBO flow

// Initializes a new axios instance to call kudos API
// const kudosClient = createApiClient(
//   teamsFx.getConfig["API_KUDOS_ENDPOINT"],
//   new BasicAuthProvider({
//     UserName: teamsFx.getConfig["API_KUDOS_USERNAME"],
//     Password: teamsFx.getConfig["API_KUDOS_PASSWORD"],
//   })
// );

// const kudosResult = await kudosClient.get("kudos_api_name");

// // Initializes a new axios instance to call Azure Functions

// const functionClient = createApiClient(teasmFx.getConfig["API_ENDPOINT"], {
//   Credential: teamsFx.getCredential(),
// });

// const functionResult = await functionClient.get("function_api_name");
