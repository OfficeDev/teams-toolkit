// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/identity";
import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";

export class AADAuthProvider implements IAuthProvider {
  private credential: TokenCredential;
  private scope: string | string[];

  constructor(credential: TokenCredential, scope: string | string[]) {
    this.credential = credential;
    this.scope = scope;
  }

  public async ConfigureAxiosRequestWithAuthenticationInfo(config: AxiosRequestConfig) {
    const token = await this.credential.getToken(this.scope);
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }
}
