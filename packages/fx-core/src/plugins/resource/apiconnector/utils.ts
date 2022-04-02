// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as fs from "fs-extra";
import { LanguageType, FileType, AuthType } from "./constants";
export interface ApiConnectorConfiguration extends Record<any, any> {
  ComponentPath: string[];
  APIName: string;
  EndPoint: string;
  ApiUserName?: string;
  AuthConfig: AuthConfig;
}

export interface AuthConfig {
  AuthType: AuthType;
}

export interface BasicAuthConfig extends AuthConfig {
  UserName: string;
  Password: string;
}
export interface AADAuthConfig extends AuthConfig {
  ReuseTeamsApp: boolean;
  TenantId?: string;
  AppId?: string;
}

export type ApiConnectorItem = Record<ApiConfigName, string>;

export enum ApiConfigName {
  ENDPOINT = "_ENDPOINT",
  AUTHENTICATION_TYPE = "_AUTHENTICATION_TYPE",
  USERNAME = "_USERNAME",
  PASSWORD = "_PASSWORD",
}

export function generateTempFolder(): string {
  const timestamp = Date.now();
  const backupFolderName = "ApiConnectorBackup-" + timestamp;
  return backupFolderName;
}

export function getSampleFileName(apiName: string, languageType: string) {
  const languageExt = languageType === LanguageType.JS ? FileType.JS : FileType.TS;
  return apiName + "." + languageExt;
}

export async function copyFileIfExist(srcFile: string, targetFile: string) {
  if (await fs.pathExists(srcFile)) {
    await fs.copyFile(srcFile, targetFile);
  }
}

export async function removeFileIfExist(file: string) {
  if (await fs.pathExists(file)) {
    await fs.remove(file);
  }
}
