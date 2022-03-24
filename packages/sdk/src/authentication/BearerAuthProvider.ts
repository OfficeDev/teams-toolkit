// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";

/**
 * Provider that handles Bearer Token authentication
 *
 * @beta
 */
export class BearerAuthProvider implements IAuthProvider {
  private getToken: () => Promise<string>;

  constructor(getToken: () => Promise<string>) {
    this.getToken = getToken;
  }

  /**
   * Adds authentication info to http requests
   *
   * @param config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   */
  public async AddAuthenticationInfo(config: AxiosRequestConfig): Promise<void> {
    const token = await this.getToken();
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }
}
