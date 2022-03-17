// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";

export class BasicAuthProvider implements IAuthProvider {
  private config: BasicAuthConfig;

  constructor(config: BasicAuthConfig) {
    if (!config.UserName) {
      throw new Error("Username does not exist!");
    }
    if (!config.Password) {
      throw new Error("Password does not exist!");
    }
    this.config = config;
  }

  public async configureAxiosRequest(config: AxiosRequestConfig) {
    config.headers = {
      Authorization:
        "Basic " + Buffer.from(this.config.UserName + ":" + this.config.Password, "base64"),
    };
  }
}

export interface BasicAuthConfig {
  UserName: string;
  Password: string;
}
