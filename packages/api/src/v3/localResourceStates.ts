// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json } from "../types";
import { TeamsAppResource } from "./resourceStates";

export interface LocalResource extends Json {
  type: string;
  endpoint?: string;
  secretFields?: string[];
}

export interface LocalFrontendResource extends LocalResource {
  type: "LocalFrontend";
  browser: string;
  https: boolean;
  trustDevCert: boolean;
  sslCertFile: string;
  sslKeyFile: string;
  endpoint: string;
}

export interface LocalSimpleAuthResource extends LocalResource {
  type: "LocalSimpleAuth";
  filePath: string;
  environmentVariableParams: string;
  endpoint: string;
}

export interface LocalBotResource extends LocalResource {
  type: "LocalBot";
  skipNgrok: boolean;
  botId: string;
  botPassword: string;
  aadObjectId: string;
  botRedirectUri?: string; // ???
  endpoint: string;
}

/**
 * common local resource profiles
 */
export interface LocalResourceState {
  app: Json;
  resources?: LocalResource[];
}

/**
 * defines local resource profiles
 */
export interface TeamsAppLocalResourceStates {
  app: TeamsAppResource;
  resources?: LocalResource[];
}
