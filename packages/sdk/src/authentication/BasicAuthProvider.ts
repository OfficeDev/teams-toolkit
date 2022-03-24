// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";

/**
 * Provider that handles Basic authentication
 *
 * @beta
 */
export class BasicAuthProvider implements IAuthProvider {
  private userName: string;
  private password: string;

  /**
   *
   * @param userName - Username used in basic auth
   * @param password - Password used in basic auth
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
   */
  public async AddAuthenticationInfo(config: AxiosRequestConfig): Promise<void> {
    config.headers = {
      Authorization: "Basic " + Buffer.from(this.userName + ":" + this.password, "base64"),
    };
  }
}
