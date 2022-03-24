// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";

export class ApiKeyProvider implements IAuthProvider {
  private keyName: string;
  private keyValue: string;
  private keyLocation: ApiKeyLocation;

  /**
   *
   * @param keyName - The name of request header or query parameter that specifies API Key
   * @param keyValue - The value of API Key
   * @param keyLocation - The location of API Key: request header or query parameter.
   */
  constructor(keyName: string, keyValue: string, keyLocation: ApiKeyLocation) {
    this.keyName = keyName;
    this.keyValue = keyValue;
    this.keyLocation = keyLocation;
  }

  /**
   * Adds authentication info to http requests
   *
   * @param config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   */
  public async AddAuthenticationInfo(config: AxiosRequestConfig): Promise<void> {
    switch (this.keyLocation) {
      case ApiKeyLocation.Header:
        config.headers = {};
        config.headers[this.keyName] = this.keyValue; // "x-api-key"
        break;
      case ApiKeyLocation.QueryParams: // url?api_key=API_KEY_VALUE
        const url = new URL(config.url!);
        url.searchParams.set(this.keyName, this.keyValue);
        config.url = url.href;
        break;
    }
  }
}

// Define available location for API Key location
export enum ApiKeyLocation {
  Header, // The API Key is placed in request header
  QueryParams, // The API Key is placed in query parameter
}
