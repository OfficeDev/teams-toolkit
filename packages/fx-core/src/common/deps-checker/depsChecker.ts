// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { DepsCheckerError } from "./depsError";
import { Result } from "@microsoft/teamsfx-api";

export interface DepsChecker {
  isInstalled(): Promise<boolean>;

  resolve(): Promise<Result<boolean, DepsCheckerError>>;

  command(): Promise<string>;

  getDepsInfo(): Promise<DepsInfo>;
}

export interface DepsInfo {
  name: string;
  isLinuxSupported: boolean;
  installVersion?: string;
  supportedVersions: string[];
  details: Map<string, string>;
}

export enum DepsType {
  AzureNode = "azure-node",
  FunctionNode = "function-node",
  SpfxNode = "spfx-node",
  Dotnet = "dotnet",
  FuncCoreTools = "func-core-tools",
  Ngrok = "ngrok",
}
