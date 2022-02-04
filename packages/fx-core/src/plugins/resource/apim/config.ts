// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { EnvInfo, Json, PluginConfig, ReadonlySolutionConfig, v3 } from "@microsoft/teamsfx-api";
import {
  TeamsToolkitComponent,
  ComponentRetryOperations,
  SolutionConfigKeys,
  AadPluginConfigKeys,
  FunctionPluginConfigKeys,
  ApimPluginConfigKeys,
} from "./constants";
import {
  AssertConfigNotEmpty,
  BuildError,
  InvalidConfigValue,
  InvalidPropertyType,
  NoPluginConfig,
} from "./error";
import { INamingRule, NamingRules } from "./utils/namingRules";

export interface IApimPluginConfig {
  resourceGroupName?: string | undefined;
  serviceName?: string | undefined;
  productId?: string | undefined;
  oAuthServerId?: string | undefined;
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
  remoteTeamsAppId?: string | undefined;
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

  get resourceGroupName(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.resourceGroupName, NamingRules.resourceGroupName);
  }
  set resourceGroupName(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.resourceGroupName, value);
  }
  get serviceName(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.serviceName, NamingRules.apimServiceName);
  }
  set serviceName(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.serviceName, value);
  }
  get productId(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.productId, NamingRules.productId);
  }
  set productId(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.productId, value);
  }
  get oAuthServerId(): string | undefined {
    return this.getValue(ApimPluginConfigKeys.oAuthServerId, NamingRules.oAuthServerId);
  }
  set oAuthServerId(value: string | undefined) {
    this.setValue(ApimPluginConfigKeys.oAuthServerId, value);
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
  private readonly configOfOtherPlugins: ReadonlySolutionConfig | Json;
  private readonly envName: string;
  constructor(envInfo: EnvInfo | v3.EnvInfoV3) {
    this.configOfOtherPlugins = envInfo.state;
    this.envName = envInfo.envName;
  }

  get functionEndpoint(): string {
    return this.checkAndGet(FunctionPluginConfigKeys.functionEndpoint);
  }

  private checkAndGet(key: string): string {
    return checkAndGetOtherPluginConfig(
      this.configOfOtherPlugins,
      TeamsToolkitComponent.FunctionPlugin,
      key,
      this.envName
    );
  }
}

export class AadPluginConfig implements IAadPluginConfig {
  private readonly configOfOtherPlugins: ReadonlySolutionConfig | Json;
  private readonly envName: string;
  constructor(envInfo: EnvInfo | v3.EnvInfoV3) {
    this.configOfOtherPlugins = envInfo.state;
    this.envName = envInfo.envName;
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
      this.configOfOtherPlugins,
      TeamsToolkitComponent.AadPlugin,
      key,
      this.envName
    );
  }
}

export class SolutionConfig implements ISolutionConfig {
  private readonly configOfOtherPlugins: ReadonlySolutionConfig | Json;
  private readonly envName: string;
  constructor(envInfo: EnvInfo | v3.EnvInfoV3) {
    this.configOfOtherPlugins = envInfo.state;
    this.envName = envInfo.envName;
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
  get remoteTeamsAppId(): string | undefined {
    return this.configOfOtherPlugins
      .get(TeamsToolkitComponent.Solution)
      ?.get(SolutionConfigKeys.remoteTeamsAppId) as string;
  }

  get subscriptionId(): string | undefined {
    return this.configOfOtherPlugins
      .get(TeamsToolkitComponent.Solution)
      ?.get(SolutionConfigKeys.subscriptionId) as string;
  }

  private checkAndGet(key: string): string {
    return checkAndGetOtherPluginConfig(
      this.configOfOtherPlugins,
      TeamsToolkitComponent.Solution,
      key,
      this.envName
    );
  }
}

function checkAndGetOtherPluginConfig(
  configOfOtherPlugins: ReadonlySolutionConfig | Json,
  component: TeamsToolkitComponent,
  key: string,
  envName: string
): string {
  const pluginConfig = configOfOtherPlugins.get
    ? configOfOtherPlugins.get(component)
    : (configOfOtherPlugins as Json)[component];
  if (!pluginConfig) {
    throw BuildError(NoPluginConfig, component, ComponentRetryOperations[component]);
  }

  const value = AssertConfigNotEmpty(component, key, pluginConfig.get(key), envName);
  if (typeof value !== "string") {
    throw BuildError(InvalidPropertyType, key, "string");
  }
  return value;
}
