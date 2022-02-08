// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Json, PluginConfig, ReadonlyPluginConfig } from "@microsoft/teamsfx-api";
import {
  TeamsToolkitComponent,
  SolutionConfigKeys,
  AadPluginConfigKeys,
  FunctionPluginConfigKeys,
  ApimPluginConfigKeys,
  ProjectConstants,
  ConfigRetryOperations,
} from "./constants";
import {
  AssertConfigNotEmpty,
  BuildError,
  EmptyConfigValue,
  InvalidConfigValue,
  InvalidPropertyType,
} from "./error";
import { INamingRule, NamingRules } from "./utils/namingRules";

export interface IApimPluginConfig {
  apimClientAADObjectId?: string | undefined;
  apimClientAADClientId?: string | undefined;
  apimClientAADClientSecret?: string | undefined;
  apiPrefix?: string | undefined;
  versionSetId?: string | undefined;
  apiPath?: string | undefined;
  apiDocumentPath?: string | undefined;
  serviceResourceId?: string | undefined;
  productResourceId?: string | undefined;
  authServerResourceId?: string | undefined;
  publisherEmail?: string | undefined;
  publisherName?: string | undefined;
  checkAndGet(key: string): string;
}

export interface IFunctionPluginConfig {
  functionEndpoint: string;
}

export interface IAadPluginConfig {
  objectId: string;
  clientId: string;
  oauth2PermissionScopeId: string;
  applicationIdUris: string;
}

export interface ISolutionConfig {
  resourceNameSuffix: string;
  teamsAppTenantId: string;
  resourceGroupName: string;
  location: string;
  subscriptionId: string | undefined;
}

export class ApimPluginConfig implements IApimPluginConfig {
  // TODO update @microsoft/teamsfx-api to the latest version
  private readonly config: PluginConfig | Json;
  private readonly envName: string;

  constructor(config: PluginConfig | Json, envName: string) {
    this.config = config;
    this.envName = envName;
  }

  get apimClientAADObjectId(): string | undefined {
    return this.getValue(
      ApimPluginConfigKeys.apimClientAADObjectId,
      NamingRules.apimClientAADObjectId
    );
  }
  set apimClientAADObjectId(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.apimClientAADObjectId, value);
  }
  get apimClientAADClientId(): string | undefined {
    return this.getValue(
      ApimPluginConfigKeys.apimClientAADClientId,
      NamingRules.apimClientAADClientId
    );
  }
  set apimClientAADClientId(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.apimClientAADClientId, value);
  }
  get apimClientAADClientSecret(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.apimClientAADClientSecret);
  }
  set apimClientAADClientSecret(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.apimClientAADClientSecret, value);
  }
  get apiPrefix(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.apiPrefix, NamingRules.apiPrefix);
  }
  set apiPrefix(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.apiPrefix, value);
  }
  get versionSetId(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.versionSetId, NamingRules.versionSetId);
  }
  set versionSetId(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.versionSetId, value);
  }
  get apiPath(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.apiPath, NamingRules.apiPath);
  }
  set apiPath(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.apiPath, value);
  }
  get apiDocumentPath(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.apiDocumentPath);
  }
  set apiDocumentPath(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.apiDocumentPath, value);
  }
  get serviceResourceId(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.serviceResourceId);
  }
  set serviceResourceId(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.serviceResourceId, value);
  }
  get productResourceId(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.productResourceId);
  }
  set productResourceId(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.productResourceId, value);
  }
  get authServerResourceId(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.authServerResourceId);
  }
  set authServerResourceId(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.authServerResourceId, value);
  }
  get publisherEmail(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.publisherEmail);
  }
  set publisherEmail(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.publisherEmail, value);
  }
  get publisherName(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.publisherName);
  }
  set publisherName(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.publisherName, value);
  }

  private getValue(key: string, namingRule?: INamingRule): string | undefined {
    const value = this.config.getString ? this.config.getString(key) : (this.config as Json)[key];

    if (namingRule && value) {
      const message = NamingRules.validate(value, namingRule);
      if (message) {
        throw BuildError(InvalidConfigValue, TeamsToolkitComponent.ApimPlugin, key, message);
      }
    }
    return value;
  }

  private setValue(key: string, value: string | undefined) {
    this.config.set ? this.config.set(key, value) : ((this.config as Json)[key] = value);
  }

  public checkAndGet(key: string): string {
    const value = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      key,
      this.getValue(key),
      this.envName
    );
    return value;
  }
}

export class FunctionPluginConfig implements IFunctionPluginConfig {
  private readonly config: ReadonlyPluginConfig | Json;
  private readonly envName: string;
  constructor(envName: string, config: ReadonlyPluginConfig | Json) {
    this.config = config;
    this.envName = envName;
  }

  get functionEndpoint(): string {
    return this.checkAndGet(FunctionPluginConfigKeys.functionEndpoint);
  }

  private checkAndGet(key: string): string {
    return checkAndGetOtherPluginConfig(
      this.config,
      TeamsToolkitComponent.FunctionPlugin,
      key,
      this.envName
    );
  }
}

export class AadPluginConfig implements IAadPluginConfig {
  private readonly config: ReadonlyPluginConfig | Json;
  private readonly envName: string;
  constructor(envName: string, config: ReadonlyPluginConfig | Json) {
    this.config = config;
    this.envName = envName;
  }

  get objectId(): string {
    return this.checkAndGet(AadPluginConfigKeys.objectId);
  }
  get clientId(): string {
    return this.checkAndGet(AadPluginConfigKeys.clientId);
  }
  get oauth2PermissionScopeId(): string {
    return this.checkAndGet(AadPluginConfigKeys.oauth2PermissionScopeId);
  }
  get applicationIdUris(): string {
    return this.checkAndGet(AadPluginConfigKeys.applicationIdUris);
  }

  private checkAndGet(key: string): string {
    return checkAndGetOtherPluginConfig(
      this.config,
      TeamsToolkitComponent.AadPlugin,
      key,
      this.envName
    );
  }
}

export class SolutionConfig implements ISolutionConfig {
  private readonly config: ReadonlyPluginConfig | Json;
  private readonly envName: string;
  constructor(envName: string, solutionConfig: ReadonlyPluginConfig | Json) {
    this.config = solutionConfig;
    this.envName = envName;
  }
  get resourceNameSuffix(): string {
    return this.checkAndGet(SolutionConfigKeys.resourceNameSuffix);
  }
  get teamsAppTenantId(): string {
    return this.checkAndGet(SolutionConfigKeys.teamsAppTenantId);
  }
  get resourceGroupName(): string {
    return this.checkAndGet(SolutionConfigKeys.resourceGroupName);
  }
  get location(): string {
    return this.checkAndGet(SolutionConfigKeys.location);
  }
  get subscriptionId(): string | undefined {
    return this.checkAndGet(SolutionConfigKeys.subscriptionId);
  }

  private checkAndGet(key: string): string {
    return checkAndGetOtherPluginConfig(
      this.config,
      TeamsToolkitComponent.Solution,
      key,
      this.envName
    );
  }
}

function checkAndGetOtherPluginConfig(
  pluginConfig: ReadonlyPluginConfig | Json,
  component: TeamsToolkitComponent,
  key: string,
  envName: string
): string {
  const value = pluginConfig.get ? pluginConfig.get(key) : (pluginConfig as Json)[key];
  if (!value) {
    throw BuildError(
      EmptyConfigValue,
      component,
      key,
      ProjectConstants.configFilePathArmSupported(envName),
      ConfigRetryOperations[component][key]
    );
  }
  if (typeof value !== "string") {
    throw BuildError(InvalidPropertyType, key, "string");
  }
  return value;
}
