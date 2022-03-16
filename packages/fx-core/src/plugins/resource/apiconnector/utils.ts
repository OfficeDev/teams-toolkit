// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export interface ApiConnectorConfiguration extends Record<any, any> {
  ProjectPath: string;
  EndPoint: string;
  ServerName: string;
  ApiAuthType?: string;
  ApiUserName?: string;
}

export type ApiConnectorItem = Record<ApiConfigName, string>;

export enum ApiConfigName {
  ENDPOINT = "_ENDPOINT",
  AUTHENTICATION_TYPE = "_AUTHENTICATION_TYPE",
  USERNAME = "_USERNAME",
  PASSWORD = "_PASSWORD",
}

export enum AuthType {
  BASIC = "Basic Auth",
  APIKEY = "Api Key",
  AAD = "Azure Active Directory",
  CERT = "certificate",
  OTHERS = "Others",
}
