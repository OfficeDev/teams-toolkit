/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    ok,
    err,
    QTreeNode,
    ConfigMap,
    NodeType,
    Stage,
    returnSystemError,
    returnUserError,
    PluginContext,
    Plugin,
    Func,
    FxError,
    Result,
    Solution,
    SolutionConfig,
    SolutionContext,
    SystemError,
    DialogMsg,
    DialogType,
    TeamsAppManifest,
    LogProvider,
    OptionItem,
    MsgLevel,
    ProductName
} from "teamsfx-api";
import { askSubscription, fillInCommonQuestions } from "./commonQuestions";
import { executeLifecycles, executeConcurrently, LifecyclesWithContext } from "./executor";
import { getPluginContext } from "./util";
import { AppStudio } from "./appstudio/appstudio";
import * as fs from "fs-extra";
import {
    DEFAULT_PERMISSION_REQUEST,
    GLOBAL_CONFIG,
    SELECTED_PLUGINS,
    PERMISSION_REQUEST,
    SolutionError,
    LOCAL_DEBUG_TAB_DOMAIN,
    LOCAL_DEBUG_TAB_ENDPOINT,
    LOCAL_DEBUG_AAD_ID,
    LOCAL_DEBUG_TEAMS_APP_ID,
    FRONTEND_DOMAIN,
    FRONTEND_ENDPOINT,
    AAD_REMOTE_CLIENT_ID,
    TEAMS_APP_MANIFEST_TEMPLATE,
    REMOTE_TEAMS_APP_ID,
    Void,
    SOLUTION_PROVISION_SUCCEEDED,
    BOTS,
    COMPOSE_EXTENSIONS,
} from "./constants";

import { SpfxPlugin } from "../../resource/spfx";
import { FrontendPlugin } from "../../resource/frontend";
import { IdentityPlugin } from "../../resource/identity";
import { SqlPlugin } from "../../resource/sql";
import { TeamsBot } from "../../resource/bot";
import { AadAppForTeamsPlugin } from "../../resource/aad";
import { FunctionPlugin } from "../../resource/function";
import { SimpleAuthPlugin } from "../../resource/simpleAuth";
import { LocalDebugPlugin } from "../../resource/localdebug";
import { ApimPlugin } from "../../resource/apim/src";
import { IAppDefinition } from "./appstudio/interface";
import {
    AzureResourceFunction,
    AzureResourceSQL,
    AzureResourcesQuestion,
    AzureSolutionQuestionNames,
    BotOptionItem,
    DeployPluginSelectQuestion,
    HostTypeOptionAzure,
    HostTypeOptionSPFx,
    FrontendHostTypeQuestion,
    TabOptionItem,
    TabScopQuestion,
    MessageExtensionItem,
    AzureResourceApim,
    createCapabilityQuestion,
    createAddAzureResourceQuestion,
} from "./question";

type LoadedPlugin = Plugin & { name: string; displayName: string; };
export type PluginsWithContext = [LoadedPlugin, PluginContext];

function newIdentityPlugin(): LoadedPlugin {
    const plugin: Plugin = new IdentityPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-identity";
    pluginWithMeta.displayName = "Microsoft Identity";
    return pluginWithMeta;
}

function newFehostPlugin(): LoadedPlugin {
    const plugin: Plugin = new FrontendPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-frontend-hosting";
    pluginWithMeta.displayName = "Tab Front-end";
    return pluginWithMeta;
}

function newSqlPlugin(): LoadedPlugin {
    const plugin: Plugin = new SqlPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-azure-sql";
    pluginWithMeta.displayName = "Azure SQL Datebase";
    return pluginWithMeta;
}

function newSpfxPlugin(): LoadedPlugin {
    const plugin: Plugin = new SpfxPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-spfx";
    pluginWithMeta.displayName = "SharePoint Framework (SPFx)";
    return pluginWithMeta;
}

function newBotPlugin(): LoadedPlugin {
    const plugin: Plugin = new TeamsBot();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-teamsbot";
    pluginWithMeta.displayName = "Bot";
    return pluginWithMeta;
}

function newAadPlugin(): LoadedPlugin {
    const plugin: Plugin = new AadAppForTeamsPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-aad-app-for-teams";
    pluginWithMeta.displayName = "AAD";
    return pluginWithMeta;
}

function newFunctionPlugin(): LoadedPlugin {
    const plugin: Plugin = new FunctionPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-function";
    pluginWithMeta.displayName = "Azure Function";
    return pluginWithMeta;
}

function newSimpleAuthPlugin(): LoadedPlugin {
    const plugin: Plugin = new SimpleAuthPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-runtime-connector";
    pluginWithMeta.displayName = "Simple Auth";
    return pluginWithMeta;
}

function newLocalDebugPlugin(): LoadedPlugin {
    const plugin: Plugin = new LocalDebugPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-local-debug";
    pluginWithMeta.displayName = "LocalDebug";
    return pluginWithMeta;
}

function newApimPlugin(): LoadedPlugin {
    const plugin: Plugin = new ApimPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "teamsfx-resource-apim";
    pluginWithMeta.displayName = "API Management";
    return pluginWithMeta;
}

// Maybe we need a state machine to track state transition.
enum SolutionRunningState {
    Idle = "idle",
    ProvisionInProgress = "ProvisionInProgress",
    DeployInProgress = "DeployInProgress",
}

export class TeamsAppSolution implements Solution {
    identityPlugin: LoadedPlugin = newIdentityPlugin();
    fehostPlugin: LoadedPlugin = newFehostPlugin();
    sqlPlugin: LoadedPlugin = newSqlPlugin();
    spfxPlugin: LoadedPlugin = newSpfxPlugin();
    botPlugin: LoadedPlugin = newBotPlugin();
    aadPlugin: LoadedPlugin = newAadPlugin();
    functionPlugin: LoadedPlugin = newFunctionPlugin();
    runtimeConnectorPlugin: LoadedPlugin = newSimpleAuthPlugin();
    localDebugPlugin: LoadedPlugin = newLocalDebugPlugin();
    apimPlugin: LoadedPlugin = newApimPlugin();

    runningState: SolutionRunningState;

    allPlugins = [
        this.identityPlugin,
        this.fehostPlugin,
        this.sqlPlugin,
        this.spfxPlugin,
        this.botPlugin,
        this.aadPlugin,
        this.functionPlugin,
        this.runtimeConnectorPlugin,
        this.localDebugPlugin,
        this.apimPlugin,
    ];
    pluginMap: Map<string, LoadedPlugin> = new Map<string, LoadedPlugin>();
    // For SPFx projects, there is no manifest.
    manifest?: TeamsAppManifest;

    constructor() {
        for (const plugin of this.allPlugins) {
            this.pluginMap.set(plugin.name, plugin);
        }
        this.runningState = SolutionRunningState.Idle;
    }

    private getPluginAndContextArray(ctx: SolutionContext, selectedPlugins: LoadedPlugin[]): PluginsWithContext[] {
        // let pluginContextConstructor = getPluginContextConstructor(ctx);
        return selectedPlugins.map((plugin) => [plugin, getPluginContext(ctx, plugin.name, this.manifest)]);
    }

    async init(ctx: SolutionContext): Promise<Result<any, FxError>> {
        return ok({});
    }

    /**
     * create
     */
    async create(ctx: SolutionContext): Promise<Result<any, FxError>> {
        // ensure that global namespace is present
        if (!ctx.config.has(GLOBAL_CONFIG)) {
            ctx.config.set(GLOBAL_CONFIG, new ConfigMap());
        }

        //Reload plugins according to user answers
        this.reloadPlugins(ctx.config, ctx.answers!);

        if (!this.spfxSelected(ctx.config)) {
            this.manifest = await AppStudio.createManifest(ctx.answers);
            if (this.manifest) Object.assign(ctx.app, this.manifest);
            await fs.writeFile(`${ctx.root}/.${ProductName}/manifest.remote.json`, JSON.stringify(this.manifest, null, 4));
            await fs.writeJSON(`${ctx.root}/permissions.json`, DEFAULT_PERMISSION_REQUEST, { spaces: 4 });
            return this.updatePermissionRequest(ctx.root, ctx.config);
        } else {
            this.manifest = await ((this.spfxPlugin as unknown) as SpfxPlugin).getManifest();
            await fs.writeFile(`${ctx.root}/.${ProductName}/manifest.remote.json`, JSON.stringify(this.manifest, null, 4));
            return ok(null);
        }
    }

    async open(ctx: SolutionContext): Promise<Result<any, FxError>> {
        return this.reloadManifestAndCheckRequiredFields(ctx);
    }

    private async reloadManifest(ctx: SolutionContext): Promise<Result<any, FxError>> {
        // read manifest
        if (!this.spfxSelected(ctx.config)) {
            try {
                this.manifest = await fs.readJson(`${ctx.root}/.${ProductName}/manifest.remote.json`);
                if (!this.manifest) {
                    return err(
                        returnSystemError(
                            new Error("Failed to read manifest file"),
                            "Solution",
                            SolutionError.FailedToLoadManifestFile,
                        ),
                    );
                }
                Object.assign(ctx.app, this.manifest);
            } catch (e) {
                return err(
                    returnSystemError(
                        new Error("Failed to read manifest file"),
                        "Solution",
                        SolutionError.FailedToLoadManifestFile,
                    ),
                );
            }
        }
        return ok({});
    }

    private async reloadManifestAndCheckRequiredFields(ctx: SolutionContext): Promise<Result<any, FxError>> {
        if (!this.spfxSelected(ctx.config)) {
            const result = await this.reloadManifest(ctx);
            return result.andThen((_) => {
                if (
                    this.manifest === undefined ||
                    this.manifest.name.short === undefined ||
                    this.manifest.name.short.length === 0
                ) {
                    return err(
                        returnSystemError(
                            new Error("Name is missing"),
                            "Solution",
                            SolutionError.FailedToLoadManifestFile,
                        ),
                    );
                }
                return ok({});
            });
        }
        return ok({});
    }

    reloadPlugins(solutionConfig: SolutionConfig, answer: ConfigMap): void {
        const selectedPlugins = [];
        const cap = answer.getStringArray(AzureSolutionQuestionNames.Capabilities);
        if (cap?.includes(TabOptionItem.label)) {
            const frontendHostType = answer.getString(AzureSolutionQuestionNames.HostType);
            if (HostTypeOptionAzure.label === frontendHostType) {
                selectedPlugins.push(this.fehostPlugin);
                const azureResources = answer.get(AzureSolutionQuestionNames.AzureResources)! as string[];
                if (azureResources.includes(AzureResourceSQL.label)) {
                    selectedPlugins.push(this.sqlPlugin);
                    selectedPlugins.push(this.identityPlugin);
                    selectedPlugins.push(this.functionPlugin);
                    if (!azureResources.includes(AzureResourceFunction.label)) {
                        // when user select sql, azure function should be bound
                        azureResources.push(AzureResourceFunction.label);
                    }
                }
                if (azureResources.includes(AzureResourceApim.label)) {
                    selectedPlugins.push(this.apimPlugin);
                    if (!selectedPlugins.includes(this.functionPlugin)) {
                        selectedPlugins.push(this.functionPlugin);
                    }
                    if (!azureResources.includes(AzureResourceFunction.label)) {
                        // when user select apim, azure function should be bound
                        azureResources.push(AzureResourceFunction.label);
                    }
                }
                if (
                    azureResources.includes(AzureResourceFunction.label) &&
                    !selectedPlugins.includes(this.functionPlugin)
                ) {
                    selectedPlugins.push(this.functionPlugin);
                }
                // AAD, LocalDebug and runtimeConnector are enabled for azure by default
                selectedPlugins.push(this.aadPlugin);
                selectedPlugins.push(this.runtimeConnectorPlugin);
                selectedPlugins.push(this.localDebugPlugin);
            } else if (HostTypeOptionSPFx.label === frontendHostType) {
                selectedPlugins.push(this.spfxPlugin);
                selectedPlugins.push(this.localDebugPlugin);
            }
        }
        if (cap?.includes(BotOptionItem.label) || cap?.includes(MessageExtensionItem.label)) {
            // Bot/Message extension plugin depend on aad plugin.
            // Currently, Bot and Message Extension features are both implemented in botPlugin
            selectedPlugins.push(this.botPlugin);
            if (!selectedPlugins.includes(this.aadPlugin)) {
                selectedPlugins.push(this.aadPlugin);
            }
        }

        solutionConfig.get(GLOBAL_CONFIG)?.set(
            SELECTED_PLUGINS,
            selectedPlugins.map((plugin) => plugin.name),
        );
    }

    private spfxSelected(config: SolutionConfig): boolean {
        // Generally, if SPFx is selected, there should be no other plugins. But we don't check this invariant here.
        const spfxExists = config
            .get(GLOBAL_CONFIG)
            ?.getStringArray(SELECTED_PLUGINS)
            ?.some((pluginName) => pluginName === this.spfxPlugin.name);
        return spfxExists === undefined ? false : spfxExists;
    }

    async scaffoldOne(plugin: LoadedPlugin, ctx: SolutionContext): Promise<Result<any, FxError>> {
        const pctx = getPluginContext(ctx, plugin.name, this.manifest);
        if (plugin.preScaffold) {
            const result = await plugin.preScaffold(pctx);
            if (result.isErr()) {
                return result;
            }
        }
        if (plugin.scaffold) {
            const result = await plugin.scaffold(pctx);
            if (result.isErr()) {
                return result;
            }
        }
        if (plugin.postScaffold) {
            const result = await plugin.postScaffold(pctx);
            if (result.isErr()) {
                return result;
            }
        }
        return ok(null);
    }

    async provisionOne(plugin: LoadedPlugin, ctx: SolutionContext): Promise<Result<any, FxError>> {
        const pctx = getPluginContext(ctx, plugin.name, this.manifest);
        if (plugin.preProvision) {
            const result = await plugin.preProvision(pctx);
            if (result.isErr()) {
                return result;
            }
        }
        if (plugin.provision) {
            const result = await plugin.provision(pctx);
            if (result.isErr()) {
                return result;
            }
        }
        if (plugin.postProvision) {
            const result = await plugin.postProvision(pctx);
            if (result.isErr()) {
                return result;
            }
        }
        return ok(null);
    }

    /**
     * update
     */
    async update(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const selectedPlugins = ctx.config.get(GLOBAL_CONFIG)?.getStringArray(SELECTED_PLUGINS);
        const isSPFx = selectedPlugins?.includes(this.spfxPlugin.name);
        if (isSPFx) {
            return err(
                returnUserError(
                    new Error("Cannot add resource for SPFx project."),
                    "Solution",
                    SolutionError.CannotAddResourceForSPFx,
                ),
            );
        }

        const alreadyHaveFunction = selectedPlugins?.includes(this.functionPlugin.name);
        const alreadyHaveSql = selectedPlugins?.includes(this.sqlPlugin.name);
        const alreadyHaveApim = selectedPlugins?.includes(this.apimPlugin.name);

        const oldResources = ctx.answers?.get(AzureSolutionQuestionNames.AzureResources) as string[];
        const addResources = ctx.answers?.get(AzureSolutionQuestionNames.AddResources) as string[];

        const addSQL = addResources.includes(AzureResourceSQL.label);
        const addFunc = addResources.includes(AzureResourceFunction.label);
        const addApim = addResources.includes(AzureResourceApim.label);

        const addResourceForPlugin: string[] = [];
        const addResourceItemsForNotification: string[] = [];
        if ((addFunc || addSQL || addApim) && !alreadyHaveFunction) {
            addResourceForPlugin.push(AzureResourceFunction.label);
        }
        if (addSQL && !alreadyHaveSql) {
            addResourceForPlugin.push(AzureResourceSQL.label);
            addResourceItemsForNotification.push(AzureResourceSQL.description!);
        }
        if (addApim && !alreadyHaveApim) {
            addResourceForPlugin.push(AzureResourceApim.label);
            addResourceItemsForNotification.push(AzureResourceApim.description!);
        }

        // add AzureResource in answer
        let reloadPlugin = false;
        for (const item of addResourceForPlugin) {
            if (!oldResources.includes(item)) {
                oldResources.push(item);
                reloadPlugin = true;
            }
        }

        if (reloadPlugin) {
            this.reloadPlugins(ctx.config, ctx.answers!);
            ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false); //if selected plugin changed, we need to re-do provision
        }

        if (addFunc || ((addSQL || addApim) && !alreadyHaveFunction)) {
            ctx.logProvider?.info(`start scaffolding Azure Function .....`);
            const result1 = await this.scaffoldOne(this.functionPlugin, ctx);
            if (result1.isErr()) {
                ctx.logProvider?.info(`failed to scaffold Azure Function!`);
                return err(result1.error);
            }
            ctx.logProvider?.info(`finish scaffolding Azure Function!`);
            addResourceItemsForNotification.push(AzureResourceFunction.description!);
        }

        if (!alreadyHaveApim && addApim) {
            // Ask subscription
            if (!ctx.config.get(GLOBAL_CONFIG)?.getString("subscriptionId")) {
                const azureToken = await ctx.azureAccountProvider?.getAccountCredentialAsync();
                if (azureToken === undefined) {
                    return err(
                        returnUserError(
                            new Error("Please login to azure using Azure Account Extension"),
                            "Solution",
                            SolutionError.NotLoginToAzure,
                        ),
                    );
                }
                const result = await askSubscription(ctx.config, azureToken, ctx.dialog);
                if (result.isErr()) {
                    return err(result.error);
                }
                ctx.config.get(GLOBAL_CONFIG)?.set("subscriptionId", result.value);
            }

            // Scaffold apim
            ctx.logProvider?.info(`start scaffolding API Management .....`);
            const result = await this.scaffoldOne(this.apimPlugin, ctx);
            if (result.isErr()) {
                ctx.logProvider?.info(`failed to scaffold API Management!`);
                return err(result.error);
            }
            ctx.logProvider?.info(`finish scaffolding API Management!`);
        }

        if (addResourceItemsForNotification.length > 0) {
            ctx.dialog?.communicate(
                new DialogMsg(DialogType.Show, {
                    description: `[Teams Toolkit] Resource "${addResourceItemsForNotification.join(
                        ",",
                    )}" have been successfully configured for your project, trigger 'TeamsFx - Provision Resource' will create the resource(s) in your Azure subscription.`,
                    level: MsgLevel.Info,
                }),
            );
        }
        return ok(Void);
    }


    private getSelectedPlugins(solutionConfig: SolutionConfig): Result<LoadedPlugin[], FxError> {
        let pluginNames = solutionConfig.get(GLOBAL_CONFIG)?.get(SELECTED_PLUGINS);

        if (pluginNames === undefined) {
            return err(
                returnUserError(
                    new Error("Selected plugin name is not valid"),
                    "Solution",
                    SolutionError.InvalidSelectedPluginNames,
                ),
            );
        }

        if (pluginNames instanceof Map) {
            const list: string[] = [];
            for (const pluginName of pluginNames.values()) {
                list.push(pluginName);
            }
            pluginNames = list;
        }

        const selectedPlugins = [];
        for (const pluginName of pluginNames as string[]) {
            const plugin = this.pluginMap.get(pluginName);
            if (plugin === undefined) {
                return err(
                    returnUserError(
                        new Error(`Plugin name ${pluginName} is not valid`),
                        "Solution",
                        SolutionError.PluginNotFound,
                    ),
                );
            }
            selectedPlugins.push(plugin);
        }
        return ok(selectedPlugins);
    }

    /**
     * scaffold
     */
    async scaffold(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx.config);
        if (maybeSelectedPlugins.isErr()) {
            return maybeSelectedPlugins;
        }
        const selectedPlugins = maybeSelectedPlugins.value;

        const loadManifestResult = await this.reloadManifest(ctx);
        if (loadManifestResult.isErr()) {
            return loadManifestResult;
        }

        const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, selectedPlugins);
        const preScaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.preScaffold?.bind(plugin), context, plugin.name];
        });
        const scaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.scaffold?.bind(plugin), context, plugin.name];
        });
        const postScaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.postScaffold?.bind(plugin), context, plugin.name];
        });

        return executeLifecycles(preScaffoldWithCtx, scaffoldWithCtx, postScaffoldWithCtx);
    }

    /**
     * Load the content of the latest permissions.json file to config
     * @param rootPath root path of this project
     * @param config solution config
     */
    private async updatePermissionRequest(
        rootPath: string,
        config: SolutionConfig,
    ): Promise<Result<SolutionConfig, FxError>> {
        if (this.spfxSelected(config)) {
            return err(
                returnUserError(
                    new Error("Cannot update permission for SPFx project"),
                    "Solution",
                    SolutionError.CannotUpdatePermissionForSPFx,
                ),
            );
        }
        const path = `${rootPath}/permissions.json`;
        if (!(await fs.pathExists(path))) {
            return err(
                returnSystemError(
                    new Error("permissions.json is missing"),
                    "Solution",
                    SolutionError.MissingPermissionsJson,
                ),
            );
        }
        const permissionRequest = await fs.readJson(path);
        config.get(GLOBAL_CONFIG)?.set(PERMISSION_REQUEST, JSON.stringify(permissionRequest));
        return ok(config);
    }

    // The assumptions of this function are:
    // 1. this.manifest is not undefined(for azure projects) already contains the latest manifest(loaded via reloadManifestAndCheckRequiredFields)
    // 2. provision of frontend hosting is done and config values has already been loaded into ctx.config
    private async createAndConfigTeamsManifest(ctx: SolutionContext): Promise<Result<IAppDefinition, FxError>> {
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx.config);
        if (maybeSelectedPlugins.isErr()) {
            return err(maybeSelectedPlugins.error);
        }
        const selectedPlugins = maybeSelectedPlugins.value;
        let endpoint: string | undefined = "";
        let domain: string | undefined = "";
        if (selectedPlugins.some((plugin) => plugin.name === this.fehostPlugin.name)) {
            endpoint = ctx.config.get(this.fehostPlugin.name)?.getString(FRONTEND_ENDPOINT);
            domain = ctx.config.get(this.fehostPlugin.name)?.getString(FRONTEND_DOMAIN);
            if (endpoint === undefined || domain === undefined) {
                return err(
                    returnSystemError(
                        new Error("Frontend endpoint or domain not found"),
                        "Solution",
                        SolutionError.FrontendEndpointAndDomainNotFound,
                    ),
                );
            }
        }

        const clientId = ctx.config.get(this.aadPlugin.name)?.getString(AAD_REMOTE_CLIENT_ID);
        if (clientId === undefined) {
            return err(
                returnSystemError(
                    new Error("Remote clientId not found"),
                    "Solution",
                    SolutionError.RemoteClientIdNotFound,
                ),
            );
        }

        const manifest = this.manifest!;
        if (selectedPlugins.some((plugin) => plugin.name === this.botPlugin.name)) {
            const capabilities = ctx.answers?.getStringArray(AzureSolutionQuestionNames.Capabilities);
            const hasBot = capabilities?.includes(BotOptionItem.label);
            const hasMsgExt = capabilities?.includes(MessageExtensionItem.label);
            if (!hasBot && !hasMsgExt) {
                return err(
                    returnSystemError(
                        new Error("One of bot and Message Extension is expected to be selected"),
                        "Solution",
                        SolutionError.InternelError,
                    ),
                );
            }
            if (hasBot) {
                const bots = ctx.config.get(this.botPlugin.name)?.getString(BOTS);
                if (!bots) {
                    return err(
                        returnSystemError(
                            new Error(`key "${BOTS}" not found in bot plugin's conifg`),
                            "Solution",
                            SolutionError.BotInternalError,
                        ),
                    );
                }
                manifest.bots = JSON.parse(bots);
            }
            if (hasMsgExt) {
                const composeExtensions = ctx.config.get(this.botPlugin.name)?.getString(COMPOSE_EXTENSIONS);
                if (!composeExtensions) {
                    return err(
                        returnSystemError(
                            new Error(`key "${COMPOSE_EXTENSIONS}" not found in bot plugin's conifg`),
                            "Solution",
                            SolutionError.BotInternalError,
                        ),
                    );
                }
                manifest.composeExtensions = JSON.parse(composeExtensions);
            }
        }
        const manifestString = JSON.stringify(manifest);
        const [appDefinition, updatedManifest] = AppStudio.getDevAppDefinition(
            manifestString,
            clientId,
            endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length - 1) : endpoint,
            domain,
        );
        const teamsAppId = ctx.config.get(GLOBAL_CONFIG)?.getString(REMOTE_TEAMS_APP_ID);
        if (!teamsAppId) {
            ctx.logProvider?.info(`Teams app not created`);
            const result = await this.createAndUpdateApp(
                appDefinition,
                "remote",
                ctx.logProvider,
                await ctx.appStudioToken?.getAccessToken(),
            );
            if (result.isErr()) {
                return result.map((_) => appDefinition);
            }

            ctx.logProvider?.info(`Teams app created ${result.value}`);
            appDefinition.appId = result.value;
            ctx.config.get(GLOBAL_CONFIG)?.set(REMOTE_TEAMS_APP_ID, result.value);
            await fs.writeFile(`${ctx.root}/.${ProductName}/manifest.remote.json`, JSON.stringify(updatedManifest, null, 4));
            return ok(appDefinition);
        } else {
            ctx.logProvider?.info(`Teams app already created: ${teamsAppId}`);
            appDefinition.appId = teamsAppId;
            const result = await this.updateApp(
                teamsAppId,
                appDefinition,
                "remote",
                ctx.logProvider,
                await ctx.appStudioToken?.getAccessToken(),
            );
            if (result.isErr()) {
                return result.map((_) => appDefinition);
            }
            await fs.writeFile(`${ctx.root}/.${ProductName}/manifest.remote.json`, JSON.stringify(updatedManifest, null, 4));
            ctx.logProvider?.info(`Teams app updated ${JSON.stringify(updatedManifest)}`);
            return ok(appDefinition);
        }
    }

    /**
     * Checks whether solution's state is idle
     */
    private checkWhetherSolutionIsIdle(): Result<Void, FxError> {
        if (this.runningState === SolutionRunningState.Idle) {
            return ok(Void);
        }

        if (this.runningState === SolutionRunningState.ProvisionInProgress) {
            return err(
                returnUserError(
                    new Error("Provision in progress. Please wait for its completion."),
                    "Solution",
                    SolutionError.ProvisionInProgress,
                ),
            );
        }
        if (this.runningState === SolutionRunningState.DeployInProgress) {
            return err(
                returnUserError(
                    new Error("Deployment in progress. Please wait for its completion."),
                    "Solution",
                    SolutionError.DeploymentInProgress,
                ),
            );
        }
        return err(
            returnSystemError(
                new Error(`unknown solution state: ${this.runningState}`),
                "Solution",
                SolutionError.UnknownSolutionRunningState,
            ),
        );
    }

    private checkWetherProvisionSucceeded(solutionConfig: SolutionConfig): boolean {
        return !!solutionConfig.get(GLOBAL_CONFIG)?.getBoolean(SOLUTION_PROVISION_SUCCEEDED);
    }

    /**
     * Provision resources. It can only run in a non-SPFx project when solution's running state is Idle.
     * Solution's provisionSucceeded config value will be set to true if provision succeeds, to false otherwise.
     *
     */
    async provision(ctx: SolutionContext): Promise<Result<any, FxError>> {
        if (this.spfxSelected(ctx.config)) {
            return err(
                returnUserError(
                    new Error("SPFx project has no provision task, you can directly deploy it."),
                    "Solution",
                    SolutionError.CannotRunProvisionInSPFxProject,
                ),
            );
        }

        const canProvision = this.checkWhetherSolutionIsIdle();
        if (canProvision.isErr()) {
            return canProvision;
        }
        try {
            this.runningState = SolutionRunningState.ProvisionInProgress;

            const provisionResult = await this.doProvision(ctx);
            if (provisionResult.isOk()) {
                ctx.logProvider?.info(`[Teams Toolkit] configuration success!`);
                await ctx.dialog?.communicate(
                    new DialogMsg(DialogType.Show, {
                        description: "[Teams Toolkit] provision finished successfully!",
                        level: MsgLevel.Info,
                    }),
                );
                ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
            } else {
                ctx.logProvider?.error(`[Teams Toolkit] configuration failed!`);
                ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false);
            }
            return provisionResult;
        } finally {
            this.runningState = SolutionRunningState.Idle;
        }
    }

    /**
     * provision
     */
    async doProvision(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx.config);
        if (maybeSelectedPlugins.isErr()) {
            return maybeSelectedPlugins;
        }
        const selectedPlugins = maybeSelectedPlugins.value;

        const loadManifestResult = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (loadManifestResult.isErr()) {
            return loadManifestResult;
        }

        //1. ask common questions for azure resources.
        const appName = this.manifest!.name.short;
        let res = await fillInCommonQuestions(
            appName,
            ctx.config,
            ctx.dialog,
            await ctx.azureAccountProvider?.getAccountCredentialAsync(),
            await ctx.appStudioToken?.getJsonObject(),
        );
        if (res.isErr()) {
            return res;
        }

        res = await this.updatePermissionRequest(ctx.root, ctx.config);
        if (res.isErr()) {
            return res;
        }

        const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, selectedPlugins);
        const preProvisionWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.preProvision?.bind(plugin), context, plugin.name];
        });
        const provisionWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.provision?.bind(plugin), context, plugin.name];
        });
        const postProvisionWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.postProvision?.bind(plugin), context, plugin.name];
        });

        return executeLifecycles(
            preProvisionWithCtx,
            provisionWithCtx,
            postProvisionWithCtx,
            async () => {
                ctx.logProvider?.info("[Teams Toolkit]: Start provisioning. It could take several minutes.");
                return ok(undefined);
            },
            async () => {
                ctx.logProvider?.info("[Teams Toolkit]: provison finished!");
                if (selectedPlugins.some((plugin) => plugin.name === this.aadPlugin.name)) {
                    const aadPlugin: AadAppForTeamsPlugin = this.aadPlugin as any;
                    const result = aadPlugin.setApplicationInContext(
                        getPluginContext(ctx, this.aadPlugin.name, this.manifest),
                    );
                    if (result.isErr()) {
                        return result;
                    }
                }
                return this.createAndConfigTeamsManifest(ctx);
            },
            async () => {
                ctx.logProvider?.info("[Teams Toolkit]: configuration finished!");
                return ok(undefined);
            },
        );
    }

    private canDeploy(solutionConfig: SolutionConfig): Result<Void, FxError> {
        if (this.spfxSelected(solutionConfig)) {
            return ok(Void);
        }
        return this.checkWhetherSolutionIsIdle().andThen((_) => {
            return this.checkWetherProvisionSucceeded(solutionConfig)
                ? ok(Void)
                : err(
                    returnUserError(
                        new Error("Please provision before deploying"),
                        "Solution",
                        SolutionError.CannotDeployBeforeProvision,
                    ),
                );
        });
    }

    async deploy(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const canDeploy = this.canDeploy(ctx.config);
        if (canDeploy.isErr()) {
            return canDeploy;
        }
        try {
            this.runningState = SolutionRunningState.DeployInProgress;
            const result = await this.doDeploy(ctx);
            if (result.isOk()) {
                ctx.logProvider?.info(`[Teams Toolkit] deploy success!`);
                await ctx.dialog?.communicate(
                    new DialogMsg(DialogType.Show, {
                        description: "[Teams Toolkit]: deploy finished successfully!",
                        level: MsgLevel.Info,
                    }),
                );
            } else {
                ctx.logProvider?.error(`[Teams Toolkit] deploy failed!`);
            }

            return result;
        } finally {
            this.runningState = SolutionRunningState.Idle;
        }
    }

    /**
     * deploy
     */
    private async doDeploy(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const res = this.getSelectedPlugins(ctx.config);
        if (res.isErr()) {
            return res;
        }

        const loadManifestResult = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (loadManifestResult.isErr()) {
            return loadManifestResult;
        }

        const optionsToDeploy = ctx.answers?.getOptionItemArray(AzureSolutionQuestionNames.PluginSelectionDeploy);
        if (optionsToDeploy === undefined || optionsToDeploy.length === 0) {
            return err(
                returnUserError(new Error(`No plugin selected`), "Solution", SolutionError.NoResourcePluginSelected),
            );
        }

        const pluginsToDeploy: LoadedPlugin[] = [];
        for (const optionItem of optionsToDeploy) {
            const filtered = this.pluginMap.get(optionItem.data as string);
            if (filtered) {
                pluginsToDeploy.push(filtered);
            }
        }
        ctx.logProvider?.info(
            `[Solution] Selected plugins to deploy:${JSON.stringify(pluginsToDeploy.map((p) => p.name))}`,
        );
        const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, pluginsToDeploy);
        const preDeployWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.preDeploy?.bind(plugin), context, plugin.name];
        });
        const deployWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.deploy?.bind(plugin), context, plugin.name];
        });
        const postDeployWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.postDeploy?.bind(plugin), context, plugin.name];
        });

        ctx.logProvider?.info(`[Solution] deploy start!`);

        return executeLifecycles(preDeployWithCtx, deployWithCtx, postDeployWithCtx);
    }

    async publish(ctx: SolutionContext): Promise<Result<any, FxError>> {
        return ok({});
    }

    /**
     * collect solution level question
     * @param ctx
     */
    async getQuestions(stage: Stage, ctx: SolutionContext): Promise<Result<QTreeNode | undefined, FxError>> {
        let node = new QTreeNode({ type: NodeType.group });
        let featureFlag = ctx.answers?.getBoolean("featureFlag");
        if (!featureFlag) featureFlag = false;
        if (stage === Stage.create) {
            const capQuestion = createCapabilityQuestion(featureFlag);
            const capabilities = new QTreeNode(capQuestion);

            node.addChild(capabilities);

            /////tab
            const tab_group = new QTreeNode({ type: NodeType.group });
            tab_group.condition = { contains: TabOptionItem.label };
            capabilities.addChild(tab_group);

            const tab_scope = new QTreeNode(TabScopQuestion);
            tab_group.addChild(tab_scope);

            const frontend_host_type = new QTreeNode(FrontendHostTypeQuestion);
            tab_group.addChild(frontend_host_type);

            const azure_resources = new QTreeNode(AzureResourcesQuestion);
            azure_resources.condition = { equals: HostTypeOptionAzure.label };
            frontend_host_type.addChild(azure_resources);

            //SPFX plugin
            if (this.spfxPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.spfxPlugin.name);
                const res = await this.spfxPlugin.getQuestions(stage, pluginCtx);
                if (res.isErr()) return res;
                const spfx = res.value as QTreeNode;
                spfx.condition = { equals: HostTypeOptionSPFx.label };
                if (spfx.data) frontend_host_type.addChild(spfx);
            }

            //Azure Function
            if (this.functionPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.functionPlugin.name, this.manifest);
                const res = await this.functionPlugin.getQuestions(stage, pluginCtx);
                if (res.isErr()) return res;
                const azure_function = res.value as QTreeNode;
                azure_function.condition = { minItems: 1 };
                if (azure_function.data) azure_resources.addChild(azure_function);
            }

            //Azure SQL
            if (this.sqlPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.sqlPlugin.name, this.manifest);
                const res = await this.sqlPlugin.getQuestions(stage, pluginCtx);
                if (res.isErr()) return res;
                const azure_sql = res.value as QTreeNode;
                azure_sql.condition = { contains: AzureResourceSQL.label };
                if (azure_sql.data) azure_resources.addChild(azure_sql);
            }

            if (featureFlag && this.botPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.botPlugin.name, this.manifest);
                const res = await this.botPlugin.getQuestions(stage, pluginCtx);
                if (res.isErr()) {
                    return res;
                }
                const botGroup = res.value as QTreeNode;
                botGroup.condition = { containsAny: [BotOptionItem.label, MessageExtensionItem.label] };
                capabilities.addChild(botGroup);
            }
        } else if (stage === Stage.update) {
            const capabilities = ctx.answers?.getStringArray(AzureSolutionQuestionNames.Capabilities);
            const htype = ctx.answers?.getString(AzureSolutionQuestionNames.HostType);
            if (capabilities && capabilities?.includes(TabOptionItem.label) && htype === HostTypeOptionAzure.label) {
                const addQuestion = createAddAzureResourceQuestion(featureFlag);
                const addAzureResources = new QTreeNode(addQuestion);
                node.addChild(addAzureResources);

                //Azure Function
                const oldResources = ctx.answers?.get(AzureResourcesQuestion.name) as string[];
                const alreadyHasFunction = oldResources.includes(AzureResourceFunction.label);

                // there two cases to add function re-scaffold: 1. select add function   2. select add sql and function is not selected when creating
                if (this.functionPlugin.getQuestions) {
                    const pluginCtx = getPluginContext(ctx, this.functionPlugin.name, this.manifest);
                    const res = await this.functionPlugin.getQuestions(stage, pluginCtx);
                    if (res.isErr()) return res;
                    const azure_function = res.value as QTreeNode;
                    if (alreadyHasFunction)
                        // if already has function, the question will appear depends on whether user select function, otherwise, the question will always show
                        azure_function.condition = { contains: AzureResourceFunction.label };
                    if (azure_function.data) addAzureResources.addChild(azure_function);
                }

                //Azure SQL
                if (this.sqlPlugin.getQuestions) {
                    const pluginCtx = getPluginContext(ctx, this.sqlPlugin.name, this.manifest);
                    const res = await this.sqlPlugin.getQuestions(stage, pluginCtx);
                    if (res.isErr()) return res;
                    const azure_sql = res.value as QTreeNode;
                    azure_sql.condition = { contains: AzureResourceSQL.label };
                    if (azure_sql.data) addAzureResources.addChild(azure_sql);
                }
            } else {
                return err(
                    returnUserError(
                        new Error("Add resource is only supported for Tab app hosted in Azure."),
                        "Solution",
                        SolutionError.AddResourceNotSupport,
                    ),
                );
            }
        } else if (stage === Stage.provision) {
            const checkRes = await this.checkWhetherSolutionIsIdle();
            if (checkRes.isErr()) return err(checkRes.error);

            const res = this.getSelectedPlugins(ctx.config);
            if (res.isErr()) {
                return err(res.error);
            }
            for (const plugin of res.value) {
                if (plugin.getQuestions) {
                    const pluginCtx = getPluginContext(ctx, plugin.name, this.manifest);
                    const getQuestionRes = await plugin.getQuestions(stage, pluginCtx);
                    if (getQuestionRes.isErr()) return getQuestionRes;
                    const subnode = getQuestionRes.value as QTreeNode;
                    node.addChild(subnode);
                }
            }
        } else if (stage === Stage.deploy) {
            const canDeploy = this.canDeploy(ctx.config);
            if (canDeploy.isErr()) {
                return err(canDeploy.error);
            }
            const res = this.getSelectedPlugins(ctx.config);
            if (res.isErr()) {
                return err(
                    returnUserError(new Error("No resource to deploy"), "Solution", SolutionError.NoResourceToDeploy),
                );
            }
            const pluginsToDeploy = res.value.filter((plugin) => !!plugin.deploy);

            const options: OptionItem[] = pluginsToDeploy.map((plugin) => {
                const item: OptionItem = { label: plugin.displayName, data: plugin.name };
                return item;
            });
            const selectQuestion = DeployPluginSelectQuestion;
            selectQuestion.option = options;
            const pluginSelection = new QTreeNode(selectQuestion);
            node.addChild(pluginSelection);

            for (const plugin of pluginsToDeploy) {
                if (plugin.getQuestions) {
                    const pluginCtx = getPluginContext(ctx, plugin.name, this.manifest);
                    const getQuestionRes = await plugin.getQuestions(stage, pluginCtx);
                    if (getQuestionRes.isErr()) return getQuestionRes;
                    const subnode = getQuestionRes.value as QTreeNode;
                    subnode.condition = { equals: plugin.displayName };
                    if (subnode.data) pluginSelection.addChild(subnode);
                }
            }
        }
        return ok(node);
    }

    // Update app manifest
    private async updateApp(
        teamsAppId: string,
        appDefinition: IAppDefinition,
        type: "localDebug" | "remote",
        logProvider?: LogProvider,
        appStudioToken?: string,
    ): Promise<Result<string, FxError>> {
        if (appStudioToken === undefined || appStudioToken.length === 0) {
            return err(
                returnSystemError(
                    new Error("Failed to get app studio token"),
                    "Solution",
                    SolutionError.FailedToGetAppStudioToken,
                ),
            );
        }
        appDefinition.appId = teamsAppId;
        if (!(await AppStudio.updateApp(teamsAppId, appDefinition, appStudioToken, logProvider))) {
            return err(
                returnSystemError(
                    new Error(`Failed to update ${type} teams app manifest`),
                    "Solution",
                    type === "remote"
                        ? SolutionError.FailedToUpdateAppIdInAppStudio
                        : SolutionError.FailedToUpdateLocalAppIdInAppStudio,
                ),
            );
        }
        await logProvider?.debug(`updated ${type} teams app id: ${teamsAppId}`);

        return ok(teamsAppId);
    }

    private async createAndUpdateApp(
        appDefinition: IAppDefinition,
        type: "localDebug" | "remote",
        logProvider?: LogProvider,
        appStudioToken?: string,
    ): Promise<Result<string, FxError>> {
        await logProvider?.debug(`${type} appDefinition: ${JSON.stringify(appDefinition)}`);
        if (appStudioToken === undefined || appStudioToken.length === 0) {
            return err(
                returnSystemError(
                    new Error("Failed to get app studio token"),
                    "Solution",
                    SolutionError.FailedToGetAppStudioToken,
                ),
            );
        }
        const teamsAppId = await AppStudio.createApp(appDefinition, appStudioToken, logProvider);
        if (teamsAppId === undefined) {
            return err(
                returnSystemError(
                    new Error(`Failed to create ${type} teams app id`),
                    "Solution",
                    type === "remote"
                        ? SolutionError.FailedToCreateAppIdInAppStudio
                        : SolutionError.FailedToCreateLocalAppIdInAppStudio,
                ),
            );
        }
        return this.updateApp(teamsAppId, appDefinition, type, logProvider, appStudioToken);
    }

    async localDebug(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx.config);
        if (maybeSelectedPlugins.isErr()) {
            return maybeSelectedPlugins;
        }

        const selectedPlugins = maybeSelectedPlugins.value;

        const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, selectedPlugins);
        const localDebugWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.localDebug?.bind(plugin), context, plugin.name];
        });
        const postLocalDebugWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.postLocalDebug?.bind(plugin), context, plugin.name];
        });
        const localDebugResult = await executeConcurrently(localDebugWithCtx);
        if (localDebugResult.isErr()) {
            return localDebugResult;
        }

        const maybeConfig = this.getLocalDebugConfig(ctx.config);
        if (maybeConfig.isErr()) {
            return maybeConfig;
        }

        const [localTabEndpoint, localTabDomain, localAADId] = maybeConfig.value;
        const [appDefinition, _updatedManifest] = AppStudio.getDevAppDefinition(
            TEAMS_APP_MANIFEST_TEMPLATE,
            localAADId,
            localTabEndpoint,
            localTabDomain,
            this.manifest!.name.short,
            this.manifest!.version,
        );

        const maybeTeamsAppId = await this.createAndUpdateApp(
            appDefinition,
            "localDebug",
            ctx.logProvider,
            await ctx.appStudioToken?.getAccessToken(),
        );
        if (maybeTeamsAppId.isErr()) {
            return maybeTeamsAppId;
        }

        ctx.config.get(GLOBAL_CONFIG)?.set(LOCAL_DEBUG_TEAMS_APP_ID, maybeTeamsAppId.value);
        let result = this.loadTeamsAppTenantId(ctx.config, await ctx.appStudioToken?.getJsonObject());

        if (result.isErr()) {
            return result;
        }
        if (selectedPlugins.some((plugin) => plugin.name === this.aadPlugin.name)) {
            const aadPlugin: AadAppForTeamsPlugin = this.aadPlugin as any;
            result = aadPlugin.setApplicationInContext(getPluginContext(ctx, this.aadPlugin.name, this.manifest), true);
            if (result.isErr()) {
                return result;
            }
        }
        return executeConcurrently(postLocalDebugWithCtx);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    private loadTeamsAppTenantId(config: SolutionConfig, appStudioToken?: object): Result<SolutionConfig, FxError> {
        if (appStudioToken === undefined) {
            return err(
                returnSystemError(
                    new Error("Graph token json is undefined"),
                    "Solution",
                    SolutionError.NoAppStudioToken,
                ),
            );
        }

        const teamsAppTenantId = (appStudioToken as any).tid;
        if (
            teamsAppTenantId === undefined ||
            !(typeof teamsAppTenantId === "string") ||
            teamsAppTenantId.length === 0
        ) {
            return err(
                returnSystemError(
                    new Error("Cannot find teams app tenant id"),
                    "Solution",
                    SolutionError.NoTeamsAppTenantId,
                ),
            );
        }

        config.get(GLOBAL_CONFIG)?.set("teamsAppTenantId", teamsAppTenantId);
        return ok(config);
    }

    private getLocalDebugConfig(config: SolutionConfig): Result<[string, string, string], SystemError> {
        const localTabEndpoint = config.get(this.localDebugPlugin.name)?.get(LOCAL_DEBUG_TAB_ENDPOINT);
        const localTabDomain = config.get(this.localDebugPlugin.name)?.get(LOCAL_DEBUG_TAB_DOMAIN);
        const localAADId = config.get(this.aadPlugin.name)?.get(LOCAL_DEBUG_AAD_ID);
        if (localTabEndpoint === undefined || typeof localTabEndpoint !== "string") {
            return err(
                returnSystemError(
                    new Error(`config ${LOCAL_DEBUG_TAB_ENDPOINT} is missing`),
                    "Solution",
                    SolutionError.LocalTabEndpointMissing,
                ),
            );
        }
        if (localTabDomain === undefined || typeof localTabDomain !== "string") {
            return err(
                returnSystemError(
                    new Error(`config ${LOCAL_DEBUG_TAB_DOMAIN} is missing`),
                    "Solution",
                    SolutionError.LocalTabDomainMissing,
                ),
            );
        }
        if (localAADId === undefined || typeof localAADId !== "string") {
            return err(
                returnSystemError(
                    new Error(`config ${LOCAL_DEBUG_AAD_ID} is missing`),
                    "Solution",
                    SolutionError.LocalClientIDMissing,
                ),
            );
        }
        return ok([localTabEndpoint, localTabDomain, localAADId]);
    }

    async callFunc(func: Func, ctx: SolutionContext): Promise<Result<any, FxError>> {
        const namespace = func.namespace;
        const array = namespace.split("/");
        if (array.length == 2) {
            const pluginName = array[1];
            const plugin = this.pluginMap.get(pluginName);
            if (plugin && plugin.callFunc) {
                const pctx = getPluginContext(ctx, plugin.name, this.manifest);
                if (func.method === "aadUpdatePermission") {
                    const result = await this.updatePermissionRequest(ctx.root, ctx.config);
                    if (result.isErr()) {
                        return result;
                    }
                }
                return await plugin.callFunc(func, pctx);
            }
        }
        return err(
            returnUserError(
                new Error(`CallFuncRouteFailed:${JSON.stringify(func)}`),
                "Solution",
                `CallFuncRouteFailed`,
            ),
        );
    }

    /**
     * user questions for customized task
     */
    async getQuestionsForUserTask(func: Func, ctx: SolutionContext): Promise<Result<QTreeNode | undefined, FxError>> {
        const namespace = func.namespace;
        const array = namespace.split("/");
        if (array.length == 2) {
            const pluginName = array[1];
            const plugin = this.pluginMap.get(pluginName);
            if (plugin) {
                if (plugin.getQuestionsForUserTask) {
                    const pctx = getPluginContext(ctx, plugin.name, this.manifest);
                    return await plugin.getQuestionsForUserTask(func, pctx);
                } else {
                    return ok(undefined);
                }
            }
        }
        return err(
            returnUserError(
                new Error(`getQuestionsForUserTaskRouteFailed:${JSON.stringify(func)}`),
                "Solution",
                `getQuestionsForUserTaskRouteFailed`,
            ),
        );
    }

    /**
     * execute user task
     */
    async executeUserTask(func: Func, ctx: SolutionContext): Promise<Result<any, FxError>> {
        const namespace = func.namespace;
        const array = namespace.split("/");
        if (array.length == 2) {
            const pluginName = array[1];
            const plugin = this.pluginMap.get(pluginName);
            if (plugin && plugin.executeUserTask) {
                const pctx = getPluginContext(ctx, plugin.name, this.manifest);
                if (func.method === "aadUpdatePermission") {
                    const result = await this.updatePermissionRequest(ctx.root, ctx.config);
                    if (result.isErr()) {
                        return result;
                    }
                }
                return await plugin.executeUserTask(func, pctx);
            }
        }
        return err(
            returnUserError(
                new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
                "Solution",
                `executeUserTaskRouteFailed`,
            ),
        );
    }
}
