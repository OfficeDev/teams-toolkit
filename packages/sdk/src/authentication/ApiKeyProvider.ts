// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { IAuthProvider } from "./IAuthProvider";

export class ApiKeyProvider implements IAuthProvider {
  private key: string;
  private value: string;
  private addType: ApiKeyAddTypes;

  constructor(key: string, value: string, addType: ApiKeyAddTypes) {
    this.key = key;
    this.value = value;
    this.addType = addType;
  }

  public async AddAuthenticationInfo(config: AxiosRequestConfig) {
    switch (this.addType) {
      case ApiKeyAddTypes.Header:
        config.headers = {};
        config.headers[this.key] = this.value;
        break;
      case ApiKeyAddTypes.QueryParams:
        const url = new URL(config.url!);
        url.searchParams.set(this.key, this.value);
        config.url = url.href;
        break;
    }
  }
}

export enum ApiKeyAddTypes {
  Header,
  QueryParams,
}
