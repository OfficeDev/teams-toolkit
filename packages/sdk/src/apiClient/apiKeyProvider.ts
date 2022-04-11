// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { AuthProvider } from "./authProvider";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * Provider that handles API Key authentication
 *
 * @beta
 */
export class ApiKeyProvider implements AuthProvider {
  private keyName: string;
  private keyValue: string;
  private keyLocation: ApiKeyLocation;

  /**
   *
   * @param keyName - The name of request header or query parameter that specifies API Key
   * @param keyValue - The value of API Key
   * @param keyLocation - The location of API Key: request header or query parameter.
   *
   * @beta
   */
  constructor(keyName: string, keyValue: string, keyLocation: ApiKeyLocation) {
    if (!keyName) {
      throw new ErrorWithCode(
        formatString(ErrorMessage.EmptyParameter, "keyName"),
        ErrorCode.InvalidParameter
      );
    }
    if (!keyValue) {
      throw new ErrorWithCode(
        formatString(ErrorMessage.EmptyParameter, "keyVaule"),
        ErrorCode.InvalidParameter
      );
    }
    this.keyName = keyName;
    this.keyValue = keyValue;
    this.keyLocation = keyLocation;
  }

  /**
   * Adds authentication info to http requests
   *
   * @param config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   *
   * @returns Updated axios request config.
   *
   * @throws {@link ErrorCode|AuthorizationInfoAlreadyExists} - when API key already exists in request header or url query parameter.
   *
   * @beta
   */
  public async AddAuthenticationInfo(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    switch (this.keyLocation) {
      case ApiKeyLocation.Header:
        if (!config.headers) {
          config.headers = {};
        }
        if (config.headers[this.keyName]) {
          throw new ErrorWithCode(
            formatString(ErrorMessage.ApiKeyAlreadyExists, "header"),
            ErrorCode.AuthorizationInfoAlreadyExists
          );
        }
        config.headers[this.keyName] = this.keyValue;
        break;
      case ApiKeyLocation.QueryParams:
        const url = new URL(config.url!, config.baseURL);
        if (url.searchParams.get(this.keyName)) {
          throw new ErrorWithCode(
            formatString(ErrorMessage.ApiKeyAlreadyExists, "query param"),
            ErrorCode.AuthorizationInfoAlreadyExists
          );
        }
        url.searchParams.set(this.keyName, this.keyValue);
        config.url = url.href;
        break;
    }

    return config;
  }
}

/**
 * Define available location for API Key location
 *
 * @beta
 */
export enum ApiKeyLocation {
  /**
   * The API Key is placed in request header
   */
  Header,
  /**
   * The API Key is placed in query parameter
   */
  QueryParams,
}
