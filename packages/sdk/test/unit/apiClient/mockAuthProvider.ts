// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { AuthProvider } from "../../../src";

export class MockAuthProvider implements AuthProvider {
  constructor() {}

  /**
   * Adds authentication info to http requests
   *
   * @param config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   */
  public async AddAuthenticationInfo(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    config.headers = {
      Authorization: "fake-token",
    };
    return config;
  }
}
