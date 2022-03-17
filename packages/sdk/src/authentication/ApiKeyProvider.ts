// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";

export class ApiKeyProvider implements IAuthProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("apiKey does not exist!");
    }
    this.apiKey = apiKey;
  }

  public async configureAxiosRequest(config: AxiosRequestConfig) {
    config.headers = {
      "X-API-Key": this.apiKey,
    };
  }
}
