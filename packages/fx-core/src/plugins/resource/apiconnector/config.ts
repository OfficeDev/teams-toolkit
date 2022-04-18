// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { AuthType, KeyLocation } from "./constants";

export interface ApiConnectorConfiguration extends Record<any, any> {
  ComponentType: string[];
  APIName: string;
  EndPoint: string;
  AuthConfig: AuthConfig;
}

export interface AuthConfig {
  AuthType: AuthType;
}

export interface BasicAuthConfig extends AuthConfig {
  UserName: string;
}
export interface AADAuthConfig extends AuthConfig {
  ReuseTeamsApp: boolean;
  TenantId?: string;
  ClientId?: string;
}
export interface APIKeyAuthConfig extends AuthConfig {
  Name: string;
  Location: KeyLocation;
}
