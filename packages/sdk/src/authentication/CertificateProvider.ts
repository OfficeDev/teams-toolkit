// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";
import { Agent } from "https";
import { SecureContextOptions } from "tls";

// Provider that handles Certificate authentication
export class CertificateProvider implements IAuthProvider {
  private certOption: SecureContextOptions;

  /**
   *
   * @param certOption - Defines the certificate used in http request
   *
   * Note: You can use helper function `createPemCertOption` and `createPfxCertOption` to initialize the cert option
   */
  constructor(certOption: SecureContextOptions) {
    this.certOption = certOption;
  }

  /**
   * Adds authentication info to http requests
   *
   * @param config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   */
  public async AddAuthenticationInfo(config: AxiosRequestConfig): Promise<void> {
    config.httpsAgent = new Agent(this.certOption);
  }
}
