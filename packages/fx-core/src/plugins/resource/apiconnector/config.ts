// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { AuthType } from "./constants";

export interface ApiConnectorConfiguration extends Record<any, any> {
  ComponentPath: string[];
  APIName: string;
  EndPoint: string;
  AuthConfig: AuthConfig;
}

export interface AuthConfig {
  AuthType: AuthType;
}

export interface BasicAuthConfig extends AuthConfig {
  UserName: string;
  Password?: string;
}
export interface AADAuthConfig extends AuthConfig {
  ReuseTeamsApp: boolean;
  TenantId?: string;
  AppId?: string;
}
