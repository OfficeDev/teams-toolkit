// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, ReadonlySolutionConfig } from 'teamsfx-api';
import {
    TeamsToolkitComponent,
    ComponentRetryLifeCycle,
    LifeCycleCommands,
    SolutionConfigKeys,
    AadPluginConfigKeys,
    FunctionPluginConfigKeys,
    ApimPluginConfigKeys,
} from '../constants';
import { AssertConfigNotEmpty, AssertNotEmpty, BuildError, InvalidPropertyType, NoPluginConfig } from '../error';

export interface IApimPluginConfig {
    resourceGroupName?: string;
    serviceName?: string;
    productId?: string;
    oAuthServerId?: string;
    apimClientAADObjectId?: string;
    apimClientAADClientId?: string;
    apimClientAADClientSecret?: string;
    apiPrefix?: string;
    versionSetId?: string;
    apiPath?: string;
    apiDocumentPath?: string;
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
    subscriptionId: string;
    resourceNameSuffix: string;
    tenantId: string;
    resourceGroupName: string;
    location: string;
}

export class ApimPluginConfig implements IApimPluginConfig {
    // TODO update teamsfx-api to the latest version
    private readonly config: Map<string, ConfigValue>;
    constructor(config: Map<string, ConfigValue>) {
        this.config = config;
    }

    get resourceGroupName(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.resourceGroupName);
    }
    get serviceName(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.serviceName);
    }
    get productId(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.productId);
    }
    get oAuthServerId(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.oAuthServerId);
    }
    get apimClientAADObjectId(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.apimClientAADObjectId);
    }
    get apimClientAADClientId(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.apimClientAADClientId);
    }
    get apimClientAADClientSecret(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.apimClientAADClientSecret);
    }
    get apiPrefix(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.apiPrefix);
    }
    get versionSetId(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.versionSetId);
    }
    get apiPath(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.apiPath);
    }
    get apiDocumentPath(): string | undefined {
        return this.getValue(ApimPluginConfigKeys.apiDocumentPath);
    }

    set resourceGroupName(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.resourceGroupName, value);
    }
    set serviceName(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.serviceName, value);
    }
    set productId(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.productId, value);
    }
    set oAuthServerId(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.oAuthServerId, value);
    }
    set apimClientAADObjectId(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.apimClientAADObjectId, value);
    }
    set apimClientAADClientId(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.apimClientAADClientId, value);
    }
    set apimClientAADClientSecret(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.apimClientAADClientSecret, value);
    }
    set apiPrefix(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.apiPrefix, value);
    }
    set versionSetId(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.versionSetId, value);
    }
    set apiPath(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.apiPath, value);
    }
    set apiDocumentPath(value: string | undefined) {
        this.setValue(ApimPluginConfigKeys.apiDocumentPath, value);
    }

    private getValue(key: string): string | undefined {
        const value = this.config.get(key);
        if (typeof value !== 'string' && typeof value !== 'undefined') {
            throw BuildError(InvalidPropertyType, key, 'string');
        }

        return value;
    }

    private setValue(key: string, value: string | undefined) {
        this.config.set(key, value);
    }
}

export class FunctionPluginConfig implements IFunctionPluginConfig {
    private readonly configOfOtherPlugins: ReadonlySolutionConfig;
    constructor(configOfOtherPlugins: ReadonlySolutionConfig) {
        this.configOfOtherPlugins = configOfOtherPlugins;
    }

    get functionEndpoint(): string {
        return this.checkAndGet(FunctionPluginConfigKeys.functionEndpoint);
    }

    private checkAndGet(key: string): string {
        return checkAndGetOtherPluginConfig(this.configOfOtherPlugins, TeamsToolkitComponent.FunctionPlugin, key);
    }
}

export class AadPluginConfig implements IAadPluginConfig {
    private readonly configOfOtherPlugins: ReadonlySolutionConfig;
    constructor(configOfOtherPlugins: ReadonlySolutionConfig) {
        this.configOfOtherPlugins = configOfOtherPlugins;
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
        return checkAndGetOtherPluginConfig(this.configOfOtherPlugins, TeamsToolkitComponent.AadPlugin, key);
    }
}

export class SolutionConfig implements ISolutionConfig {
    private readonly configOfOtherPlugins: ReadonlySolutionConfig;
    constructor(configOfOtherPlugins: ReadonlySolutionConfig) {
        this.configOfOtherPlugins = configOfOtherPlugins;
    }

    get subscriptionId(): string {
        return this.checkAndGet(SolutionConfigKeys.subscriptionId);
    }
    get resourceNameSuffix(): string {
        return this.checkAndGet(SolutionConfigKeys.resourceNameSuffix);
    }
    get tenantId(): string {
        return this.checkAndGet(SolutionConfigKeys.tenantId);
    }
    get resourceGroupName(): string {
        return this.checkAndGet(SolutionConfigKeys.resourceGroupName);
    }
    get location(): string {
        return this.checkAndGet(SolutionConfigKeys.location);
    }

    private checkAndGet(key: string): string {
        return checkAndGetOtherPluginConfig(this.configOfOtherPlugins, TeamsToolkitComponent.Solution, key);
    }
}

function checkAndGetOtherPluginConfig(configOfOtherPlugins: ReadonlySolutionConfig, component: TeamsToolkitComponent, key: string): string {
    const pluginConfig = configOfOtherPlugins.get(component);
    if (!pluginConfig) {
        throw BuildError(NoPluginConfig, component, LifeCycleCommands[ComponentRetryLifeCycle[component]]);
    }

    const value = AssertConfigNotEmpty(component, key, pluginConfig.get(key));
    if (typeof value !== 'string') {
        throw BuildError(InvalidPropertyType, key, 'string');
    }
    return value;
}
