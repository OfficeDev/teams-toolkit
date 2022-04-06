// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { AuthProvider } from "./authProvider";

/**
 * Provider that handles Basic authentication
 *
 * @beta
 */
export class BasicAuthProvider implements AuthProvider {
  private userName: string;
  private password: string;

  /**
   *
   * @param userName - Username used in basic auth
   * @param password - Password used in basic auth
   *
   * @beta
   */
  constructor(userName: string, password: string) {
    this.userName = userName;
    this.password = password;
  }

  /**
   * Adds authentication info to http requests
   *
   * @param config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   *
   * @beta
   */
  public async AddAuthenticationInfo(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    if (config.auth) {
      throw new Error("Basic credential already exists!");
    }

    config.auth = {
      username: this.userName,
      password: this.password,
    };

    return config;
  }
}
