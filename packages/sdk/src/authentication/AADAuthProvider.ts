// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { AppCredential, AuthenticationConfiguration } from "..";
import { IAuthProvider } from "./IAuthProvider";

export class AADAuthProvider implements IAuthProvider {
  private appCredential: AppCredential;

  constructor(config: AuthenticationConfiguration) {
    this.appCredential = new AppCredential(config);
  }

  public async configureAxiosRequest(config: AxiosRequestConfig) {
    const token = await this.appCredential.getToken([]);
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }
}
