// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, Result } from "..";
import { Inputs, Json, Void } from "../types";
import { Context, DeploymentInputs, ProvisionInputs } from "./types";

export interface InnerLoopPlugin {
  runtimeStacks: RuntimeStacks[];
  languages: string[];
  scaffoldSourceCode: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
  //localDebug
}

export interface HostingPlugin {
  runtimeStacks: RuntimeStacks[];
  provisionResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    tokenProvider: AzureAccountProvider,
    resourceManifest?: AzureResource
  ) => Promise<Result<AzureResource, FxError>>;
  configureResource?: (
    ctx: Context,
    inputs: ProvisionInputs,
    configs: Record<string, string>,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
  deploy?: (
    ctx: Context,
    inputs: DeploymentInputs,
    resourceManifest: AzureResource,
    tokenProvider: AzureAccountProvider
  ) => Promise<Result<Void, FxError>>;
}

export enum RuntimeStacks {
  DoNet_6_EA = ".NET 6(Early Access)",
  DoNet_5 = ".NET 5",
  DoNet_Core_3_1 = ".NET Core 3.1(LTS)",
  ASP_DoNET_V48 = "ASP.NET V4.8",
  ASP_DoNET_V35 = "ASP.NET V3.5",
  Node12LTS = "Node 12 LTS",
  Node14LTS = "Node 14 LTS",
}

export enum AzureResourceTypes {
  AppService = "App Service",
  StaticWebApp = "Static Web App",
  FunctionApp = "Function App",
  ManagedIdentity = "Managed Identity",
  StorageAccount = "Storage account",
  AzureBot = "Azure Bot",
  AzureSQLDatabase = "SQL database",
  AzureActiveDirectoryApp = "AAD App",
}

/**
 * defines the provision output of HostingPlugin
 */
export interface AzureResource extends Json {
  type: AzureResourceTypes;
  id: string; //resourceId
  name: string;
  endpoint?: string;
  skuName?: string;
  secretFields?: string[];
}

export interface AzureManagedIdentity extends AzureResource {
  type: AzureResourceTypes.ManagedIdentity;
  clientId: string;
}

export interface AzureStorageAccount extends AzureResource {
  type: AzureResourceTypes.StorageAccount;
  endpoint: string;
}

export interface AzureSQLDatabase extends AzureResource {
  type: AzureResourceTypes.AzureSQLDatabase;
  endpoint: string;
  adminUserName: string;
  databaseName: string;
}

export interface AzureBot extends AzureResource {
  type: AzureResourceTypes.AzureBot;
  endpoint: string;
  botId: string;
  botPassword: string;
  objectId: string; //???
}

export interface AzureAppService extends AzureResource {
  type: AzureResourceTypes.AppService;
  appType: "Web App";
}
export interface AzureActiveDirectoryApp {
  clientId: string;
  clientSecret: string;
  objectId: string;
  oauth2PermissionScopeId: string;
  tenantId: string;
  oauthHost: string;
  oauthAuthority: string;
  applicationIdUris: string;
}

export interface TeamsAppPluginSettings {
  tab: {
    innerLoopPlugins: string[];
    hostingPlugins: string[];
    resourcePlugins: string[];
  };
  bot: {
    innerLoopPlugins: string[];
    hostingPlugins: string[];
    resourcePlugins: string[];
  };
}

export interface ComputingResource {
  id: string;
  type: AzureResourceTypes;
  innerLoopPlugin: string;
  hostingPlugin: string;
  runtimeStack: RuntimeStacks;
  dependencies: string[];
  programmingLanguage: string;
}

export interface DatabaseResource {
  id: string;
  type: AzureResourceTypes;
  hostingPlugin: string;
}

export interface TeamsAppProjectSettings {
  capabilities: ("Tab" | "Bot" | "MessagingExtension")[];
  tab: ComputingResource;
  bot: ComputingResource;
  dependencies: (DatabaseResource | ComputingResource)[];
}
