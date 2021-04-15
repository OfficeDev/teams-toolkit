// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { EnvironmentUtils } from "../utils/environment-utils";
import { EnvironmentVariables, FrontendConfigInfo } from "../constants";
import { PluginContext } from "fx-api";
import { ManifestVariables, TabScopeManifest } from "../resources/tabScope";

export interface FunctionEnvironment {
    defaultName: string;
    endpoint: string;
}

export interface RuntimeEnvironment {
    endpoint: string;
    startLoginPageUrl: string;
}

export interface AADEnvironment {
    clientId: string;
}

export class FrontendProvision {
    public static async setEnvironments(
        envFilePath: string,
        functionEnv?: FunctionEnvironment,
        runtimeEnv?: RuntimeEnvironment,
        aadEnv?: AADEnvironment,
    ): Promise<void> {
        const envs: { [key: string]: string } = {};
        if (functionEnv) {
            envs[EnvironmentVariables.FuncName] = functionEnv.defaultName;
            envs[EnvironmentVariables.FuncEndpoint] = functionEnv.endpoint;
        }

        if (runtimeEnv) {
            envs[EnvironmentVariables.RuntimeEndpoint] = runtimeEnv.endpoint;
            envs[EnvironmentVariables.StartLoginPage] = runtimeEnv.startLoginPageUrl;
        }

        if (aadEnv) {
            envs[EnvironmentVariables.ClientID] = aadEnv.clientId;
        }

        await EnvironmentUtils.writeEnvironments(envFilePath, envs);
    }

    public static setTabScope(ctx: PluginContext, variables: ManifestVariables): void {
        const tabScopes = ctx.config.getStringArray(FrontendConfigInfo.TabScopes);
        const validatedTabScopes = TabScopeManifest.validateScopes(tabScopes);
        // Always overwrite these configs to support both local debug and remote debug
        ctx.config.set(FrontendConfigInfo.ConfigurableTab, TabScopeManifest.getConfigurableTab(variables, validatedTabScopes));
        ctx.config.set(FrontendConfigInfo.StaticTab, TabScopeManifest.getStaticTab(variables, validatedTabScopes));
    }
}
