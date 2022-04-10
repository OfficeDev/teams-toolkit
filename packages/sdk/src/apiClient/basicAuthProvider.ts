// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { AuthProvider } from "./authProvider";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

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
    if (!userName) {
      throw new ErrorWithCode(
        formatString(ErrorMessage.EmptyParameter, "username"),
        ErrorCode.InvalidParameter
      );
    }
    if (!password) {
      throw new ErrorWithCode(
        formatString(ErrorMessage.EmptyParameter, "password"),
        ErrorCode.InvalidParameter
      );
    }
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
    if (config.headers && config.headers["Authorization"]) {
      throw new ErrorWithCode(
        ErrorMessage.AuthorizationHeaderAlreadyExists,
        ErrorCode.AuthorizationInfoAlreadyExists
      );
    }
    if (config.auth) {
      throw new ErrorWithCode(
        ErrorMessage.BasicCredentialAlreadyExists,
        ErrorCode.AuthorizationInfoAlreadyExists
      );
    }

    config.auth = {
      username: this.userName,
      password: this.password,
    };

    return config;
  }
}
