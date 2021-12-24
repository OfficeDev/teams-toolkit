// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface DepsChecker {
  isInstalled(): Promise<boolean>;

  resolve(): Promise<boolean>;

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
