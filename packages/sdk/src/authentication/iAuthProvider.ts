// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";

// Defines method that injects authentication info to http requests
export interface IAuthProvider {
  /**
   * Adds authentication info to http requests
   *
   * @param config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   */
  AddAuthenticationInfo: (config: AxiosRequestConfig) => Promise<void>;
}
