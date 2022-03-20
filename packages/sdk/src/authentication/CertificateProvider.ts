// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";

export class CertificateProvider implements IAuthProvider {
  private userName: string;
  private password: string;

  constructor(userName: string, password: string) {
    this.userName = userName;
    this.password = password;
  }

  public async ConfigureAxiosRequestWithAuthenticationInfo(config: AxiosRequestConfig) {
    config.headers = {
      Authorization: "Basic " + Buffer.from(this.userName + ":" + this.password, "base64"),
    };
  }
}
