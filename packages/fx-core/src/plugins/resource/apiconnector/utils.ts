// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { LanguageType, FileType } from "./constants";
export interface ApiConnectorConfiguration extends Record<any, any> {
  ComponentPath: string[];
  APIName: string;
  ApiAuthType?: string;
  EndPoint: string;
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

export function generateTempFolder(): string {
  const timestamp = Date.now();
  const backupFolderName = "backup-" + timestamp;
  return backupFolderName;
}

export function getSampleCodeFileName(ApiName: string, languageType: string): string {
  const fileEx = languageType === LanguageType.JS ? FileType.JS : FileType.TS;
  return ApiName + "." + fileEx;
}
