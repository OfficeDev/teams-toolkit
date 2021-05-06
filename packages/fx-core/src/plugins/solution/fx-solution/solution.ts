/* eslint-disable @typescript-eslint/ban-types */
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
    DialogMsg,
    DialogType,
    TeamsAppManifest,
    LogProvider,
    OptionItem,
    MsgLevel,
    ConfigFolderName,
    AzureSolutionSettings,
    Err,
    UserError,
    SystemError
} from "fx-api";
import { askSubscription, fillInCommonQuestions } from "./commonQuestions";
import { executeLifecycles, executeConcurrently, LifecyclesWithContext } from "./executor";
import { getPluginContext } from "./util";
import { AppStudio } from "./appstudio/appstudio";
import * as fs from "fs-extra";
import {
    DEFAULT_PERMISSION_REQUEST,
    GLOBAL_CONFIG,
    PERMISSION_REQUEST,
    SolutionError,
    LOCAL_DEBUG_TAB_DOMAIN,
    LOCAL_DEBUG_TAB_ENDPOINT,
    LOCAL_DEBUG_AAD_ID,
    LOCAL_DEBUG_TEAMS_APP_ID,
    FRONTEND_DOMAIN,
    FRONTEND_ENDPOINT,
    REMOTE_TEAMS_APP_ID,
    Void,
    SOLUTION_PROVISION_SUCCEEDED,
    BOT_DOMAIN,
    LOCAL_APPLICATION_ID_URIS,
    LOCAL_CLIENT_SECRET,
    LOCAL_DEBUG_BOT_DOMAIN,
    REMOTE_AAD_ID,
    REMOTE_APPLICATION_ID_URIS,
    REMOTE_CLIENT_SECRET,
    WEB_APPLICATION_INFO_SOURCE,
    LOCAL_WEB_APPLICATION_INFO_SOURCE,
    PROGRAMMING_LANGUAGE,
    REMOTE_MANIFEST,
    BOT_ID,
    LOCAL_BOT_ID,
    STATIC_TABS_TPL,
    CONFIGURABLE_TABS_TPL,
    BOTS_TPL,
} from "./constants";

import { SpfxPlugin } from "../../resource/spfx";
import { FrontendPlugin } from "../../resource/frontend";
import { IdentityPlugin } from "../../resource/identity";
import { SqlPlugin } from "../../resource/sql";
import { TeamsBot } from "../../resource/bot";
import { AadAppForTeamsPlugin } from "../../resource/aad";
import { FunctionPlugin } from "../../resource/function";
import { SimpleAuthPlugin } from "../../resource/simpleauth";
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
    MessageExtensionItem,
    AzureResourceApim,
    createCapabilityQuestion,
    createAddAzureResourceQuestion,
    AskSubscriptionQuestion,
    addCapabilityQuestion,
    ProgrammingLanguageQuestion,
} from "./question";
import Mustache from "mustache";
import path from "path";
import { AppStudioPlugin } from "../../resource/appstudio";
import { ErrorResponse } from "@azure/arm-resources/esm/models/mappers";
import * as strings from "../../../resources/strings.json";
import * as util from "util";
import { deepCopy } from "../../../common/tools";

type LoadedPlugin = Plugin & { name: string; displayName: string; };
export type PluginsWithContext = [LoadedPlugin, PluginContext];

type ParamForRegisterTeamsAppAndAad = {
    "app-name": string;
    environment: "local" | "remote";
    endpoint: string;
    "root-path": string;
};

function newIdentityPlugin(): LoadedPlugin {
    const plugin: Plugin = new IdentityPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-identity";
    pluginWithMeta.displayName = "Microsoft Identity";
    return pluginWithMeta;
}

function newFehostPlugin(): LoadedPlugin {
    const plugin: Plugin = new FrontendPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-frontend-hosting";
    pluginWithMeta.displayName = "Tab Front-end";
    return pluginWithMeta;
}

function newSqlPlugin(): LoadedPlugin {
    const plugin: Plugin = new SqlPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-azure-sql";
    pluginWithMeta.displayName = "Azure SQL Datebase";
    return pluginWithMeta;
}

function newSpfxPlugin(): LoadedPlugin {
    const plugin: Plugin = new SpfxPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-spfx";
    pluginWithMeta.displayName = "SharePoint Framework (SPFx)";
    return pluginWithMeta;
}

function newBotPlugin(): LoadedPlugin {
    const plugin: Plugin = new TeamsBot();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-bot";
    pluginWithMeta.displayName = "Bot";
    return pluginWithMeta;
}

function newAadPlugin(): LoadedPlugin {
    const plugin: Plugin = new AadAppForTeamsPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-aad-app-for-teams";
    pluginWithMeta.displayName = "AAD";
    return pluginWithMeta;
}

function newFunctionPlugin(): LoadedPlugin {
    const plugin: Plugin = new FunctionPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-function";
    pluginWithMeta.displayName = "Azure Function";
    return pluginWithMeta;
}

function newSimpleAuthPlugin(): LoadedPlugin {
    const plugin: Plugin = new SimpleAuthPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-simple-auth";
    pluginWithMeta.displayName = "Simple Auth";
    return pluginWithMeta;
}

function newLocalDebugPlugin(): LoadedPlugin {
    const plugin: Plugin = new LocalDebugPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-local-debug";
    pluginWithMeta.displayName = "LocalDebug";
    return pluginWithMeta;
}

function newApimPlugin(): LoadedPlugin {
    const plugin: Plugin = new ApimPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-apim";
    pluginWithMeta.displayName = "API Management";
    return pluginWithMeta;
}

function newAppStudioPlugin(): LoadedPlugin {
    const plugin: Plugin = new AppStudioPlugin();
    const pluginWithMeta: LoadedPlugin = plugin as LoadedPlugin;
    pluginWithMeta.name = "fx-resource-appstudio";
    pluginWithMeta.displayName = "App Studio";
    return pluginWithMeta;
}

// Maybe we need a state machine to track state transition.
enum SolutionRunningState {
    Idle = "idle",
    ProvisionInProgress = "ProvisionInProgress",
    DeployInProgress = "DeployInProgress",
    PublishInProgress = "PublishInProgress"
}

export class TeamsAppSolution implements Solution {
    identityPlugin: LoadedPlugin = newIdentityPlugin();
    fehostPlugin: LoadedPlugin = newFehostPlugin();
    sqlPlugin: LoadedPlugin = newSqlPlugin();
    spfxPlugin: LoadedPlugin = newSpfxPlugin();
    botPlugin: LoadedPlugin = newBotPlugin();
    aadPlugin: LoadedPlugin = newAadPlugin();
    functionPlugin: LoadedPlugin = newFunctionPlugin();
    simpleAuthPlugin: LoadedPlugin = newSimpleAuthPlugin();
    localDebugPlugin: LoadedPlugin = newLocalDebugPlugin();
    apimPlugin: LoadedPlugin = newApimPlugin();
    appStudioPlugin: LoadedPlugin = newAppStudioPlugin();

    runningState: SolutionRunningState;

    allPlugins = [
        this.identityPlugin,
        this.fehostPlugin,
        this.sqlPlugin,
        this.spfxPlugin,
        this.botPlugin,
        this.aadPlugin,
        this.functionPlugin,
        this.simpleAuthPlugin,
        this.localDebugPlugin,
        this.apimPlugin,
    ];
    pluginMap: Map<string, LoadedPlugin> = new Map<string, LoadedPlugin>();

    constructor() {
        for (const plugin of this.allPlugins) {
            this.pluginMap.set(plugin.name, plugin);
        }
        this.runningState = SolutionRunningState.Idle;
    }

    private getPluginAndContextArray(ctx: SolutionContext, selectedPlugins: LoadedPlugin[], manifest: TeamsAppManifest): PluginsWithContext[] {
        // let pluginContextConstructor = getPluginContextConstructor(ctx);
        return selectedPlugins.map((plugin) => [plugin, getPluginContext(ctx, plugin.name, manifest)]);
    }

    async init(ctx: SolutionContext): Promise<Result<any, FxError>> {
        return ok({});
    }

    fillInSolutionSettings(ctx: SolutionContext): Result<AzureSolutionSettings, FxError> {
        const answers = ctx.answers;
        if(!answers) {
            return err(
                returnSystemError(
                    new Error("answer is undefined"),
                    "Solution",
                    SolutionError.InternelError,
                ),
            );
        }
        const projectSettings = ctx.projectSettings;
        if(!projectSettings){
            return err(
                returnSystemError(
                    new Error("projectSettings is undefined"),
                    "Solution",
                    SolutionError.InternelError,
                ),
            );
        }
        if(!projectSettings.solutionSettings){
            return err(
                returnSystemError(
                    new Error("solutionSettings is undefined"),
                    "Solution",
                    SolutionError.InternelError,
                ),
            );
        }
        let capabilities = answers.getStringArray(AzureSolutionQuestionNames.Capabilities) || [];
        if(!capabilities || capabilities.length === 0){
            return err(
                returnSystemError(
                    new Error("capabilities is empty"),
                    "Solution",
                    SolutionError.InternelError,
                ),
            );
        }
        let hostType = answers.getString(AzureSolutionQuestionNames.HostType);
        if(capabilities.includes(BotOptionItem.id) || capabilities.includes(MessageExtensionItem.id))
            hostType = HostTypeOptionAzure.id;
        if(!hostType){
            return err(
                returnSystemError(
                    new Error("hostType is undefined"),
                    "Solution",
                    SolutionError.InternelError,
                ),
            );
        }
        let azureResources:string[]|undefined;
        if(hostType === HostTypeOptionAzure.id && capabilities.includes(TabOptionItem.id)){
            azureResources = answers.getStringArray(AzureSolutionQuestionNames.AzureResources);
            if(azureResources){
                if( (azureResources.includes(AzureResourceSQL.id) || azureResources.includes(AzureResourceApim.id)) && !azureResources.includes(AzureResourceFunction.id)){
                    azureResources.push(AzureResourceFunction.id);
                }
            }
            else azureResources = [];
        }
        const solutionSettings:AzureSolutionSettings = {
            name: projectSettings.solutionSettings.name,
            version: projectSettings.solutionSettings.version,
            hostType: hostType,
            capabilities : capabilities,
            azureResources: azureResources || [],
            activeResourcePlugins:[]
        }; 
        projectSettings.solutionSettings = solutionSettings;
        return ok(solutionSettings);
    }

    /**
     * create
     */
    async create(ctx: SolutionContext): Promise<Result<any, FxError>> {
        // ensure that global namespace is present
        if (!ctx.config.has(GLOBAL_CONFIG)) {
            ctx.config.set(GLOBAL_CONFIG, new ConfigMap());
        }
        
        // Only non-SPFx project will ask this question.
        const lang = ctx.answers?.getString(AzureSolutionQuestionNames.ProgrammingLanguage);
        if (lang) {
            ctx.config.get(GLOBAL_CONFIG)?.set(PROGRAMMING_LANGUAGE, lang);
        }

        const settingsRes = this.fillInSolutionSettings(ctx);
        if(settingsRes.isErr()) 
            return err(settingsRes.error);

        const solutionSettings = settingsRes.value;

        //Reload plugins according to user answers
        this.reloadPlugins(solutionSettings);

        const defaultIconPath = path.join(__dirname, "../../../../templates/plugins/solution/defaultIcon.png");
        await fs.copy(defaultIconPath, `${ctx.root}/.${ConfigFolderName}/color.png`);
        await fs.copy(defaultIconPath, `${ctx.root}/.${ConfigFolderName}/outline.png`);
        if (this.isAzureProject(ctx)) {
            const manifest = await AppStudio.createManifest(ctx.projectSettings!);
            if (manifest) Object.assign(ctx.app, manifest);
            await fs.writeFile(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`, JSON.stringify(manifest, null, 4));
            await fs.writeJSON(`${ctx.root}/permissions.json`, DEFAULT_PERMISSION_REQUEST, { spaces: 4 });
        } else {
            const manifest = await ((this.spfxPlugin as unknown) as SpfxPlugin).getManifest();
            await fs.writeFile(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`, JSON.stringify(manifest, null, 4));
        }
        return ok(Void);
    }

    async open(ctx: SolutionContext): Promise<Result<any, FxError>> {
        return this.reloadManifestAndCheckRequiredFields(ctx);
    }

    private async reloadManifest(ctx: SolutionContext): Promise<Result<TeamsAppManifest, FxError>> {
        try {
            const manifest = await fs.readJson(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`);
            if (!manifest) {
                return err(
                    returnSystemError(
                        new Error("Failed to read manifest file"),
                        "Solution",
                        SolutionError.FailedToLoadManifestFile,
                    ),
                );
            }
            Object.assign(ctx.app, manifest);
            return ok(manifest);
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

    private async reloadManifestAndCheckRequiredFields(ctx: SolutionContext): Promise<Result<TeamsAppManifest, FxError>> {
        const result = await this.reloadManifest(ctx);
        return result.andThen((manifest) => {
            if (
                manifest === undefined ||
                manifest.name.short === undefined ||
                manifest.name.short.length === 0
            ) {
                return err(
                    returnSystemError(
                        new Error("Name is missing"),
                        "Solution",
                        SolutionError.FailedToLoadManifestFile,
                    ),
                );
            }
            return ok(manifest);
        });
    }

    reloadPlugins(solutionSettings: AzureSolutionSettings): void {
        const pluginNameSet = new Set<string>();
        pluginNameSet.add(this.localDebugPlugin.name);

        if(solutionSettings.hostType === HostTypeOptionSPFx.id){
            pluginNameSet.add(this.spfxPlugin.name);
        }
        else {
            const cap = solutionSettings.capabilities!;
            if (cap.includes(TabOptionItem.id)) {
                pluginNameSet.add(this.fehostPlugin.name);
                const azureResources = solutionSettings.azureResources? solutionSettings.azureResources:[];
                if (azureResources.includes(AzureResourceSQL.id)) {
                    pluginNameSet.add(this.sqlPlugin.name);
                    pluginNameSet.add(this.identityPlugin.name);
                    pluginNameSet.add(this.functionPlugin.name);
                }
                if (azureResources.includes(AzureResourceApim.id)) {
                    pluginNameSet.add(this.apimPlugin.name);
                    pluginNameSet.add(this.functionPlugin.name);
                }
                if (azureResources.includes(AzureResourceFunction.id)) {
                    pluginNameSet.add(this.functionPlugin.name);
                }
                // AAD, LocalDebug and runtimeConnector are enabled for azure by default
                pluginNameSet.add(this.aadPlugin.name);
                pluginNameSet.add(this.simpleAuthPlugin.name);
            }
            if (cap.includes(BotOptionItem.id) || cap.includes(MessageExtensionItem.id)) {
                // Bot/Message extension plugin depend on aad plugin.
                // Currently, Bot and Message Extension features are both implemented in botPlugin
                pluginNameSet.add(this.botPlugin.name);
                pluginNameSet.add(this.aadPlugin.name);
            }
        }
        solutionSettings.activeResourcePlugins = Array.from(pluginNameSet);
    }

    private spfxSelected(ctx: SolutionContext): boolean {
        // Generally, if SPFx is selected, there should be no other plugins. But we don't check this invariant here.
        const spfxExists = this.getAzureSolutionSettings(ctx).activeResourcePlugins.some((pluginName) => pluginName === this.spfxPlugin.name);
        return spfxExists === undefined ? false : spfxExists;
    }

    private isAzureProject(ctx: SolutionContext): boolean{
        const settings = this.getAzureSolutionSettings(ctx);
        return HostTypeOptionAzure.id === settings.hostType;
    }

    async scaffoldOne(plugin: LoadedPlugin, ctx: SolutionContext): Promise<Result<any, FxError>> {
        const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (maybeManifest.isErr()) {
            return maybeManifest;
        }
        const manifest = maybeManifest.value;
        const pctx = getPluginContext(ctx, plugin.name, manifest);
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
        const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (maybeManifest.isErr()) {
            return maybeManifest;
        }
        const manifest = maybeManifest.value;

        const pctx = getPluginContext(ctx, plugin.name, manifest);
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
        return await this.executeAddResource(ctx);
    }


    private getSelectedPlugins(ctx: SolutionContext): Result<LoadedPlugin[], FxError> {
        const settings = this.getAzureSolutionSettings(ctx);
        const pluginNames = settings.activeResourcePlugins;
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
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx);
        if (maybeSelectedPlugins.isErr()) {
            return maybeSelectedPlugins;
        }
        const selectedPlugins = maybeSelectedPlugins.value;
        return await this.doScaffold(ctx, selectedPlugins);
    }

    async doScaffold(ctx: SolutionContext, selectedPlugins:LoadedPlugin[]): Promise<Result<any, FxError>> {
        const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (maybeManifest.isErr()) {
            return maybeManifest;
        }
        const manifest = maybeManifest.value;

        const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, selectedPlugins, manifest);
        const preScaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.preScaffold?.bind(plugin), context, plugin.name];
        });
        const scaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.scaffold?.bind(plugin), context, plugin.name];
        });
        const postScaffoldWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.postScaffold?.bind(plugin), context, plugin.name];
        });

        const res = await executeLifecycles(preScaffoldWithCtx, scaffoldWithCtx, postScaffoldWithCtx);
        return res;
    }

    /**
     * Load the content of the latest permissions.json file to config
     * @param rootPath root path of this project
     * @param config solution config
     */
    private async getPermissionRequest(
        ctx:SolutionContext
    ): Promise<Result<string, FxError>> {
        if (!this.isAzureProject(ctx)) {
            return err(
                returnUserError(
                    new Error("Cannot update permission for SPFx project"),
                    "Solution",
                    SolutionError.CannotUpdatePermissionForSPFx,
                ),
            );
        }
        const path = `${ctx.root}/permissions.json`;
        if (!(await fs.pathExists(path))) {
            return err(
                returnSystemError(
                    new Error("permissions.json is missing"),
                    "Solution",
                    SolutionError.MissingPermissionsJson,
                ),
            );
        }
        const permissionRequest = await fs.readJSON(path);
        return ok(JSON.stringify(permissionRequest));
    }

    private createManifestForRemote(ctx: SolutionContext, manifest: TeamsAppManifest): Result<[IAppDefinition, TeamsAppManifest], FxError> {
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx);
        if (maybeSelectedPlugins.isErr()) {
            return err(maybeSelectedPlugins.error);
        }
        const selectedPlugins = maybeSelectedPlugins.value;
        if (selectedPlugins.some((plugin) => plugin.name === this.botPlugin.name)) {
            const capabilities = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings).capabilities;
            const hasBot = capabilities?.includes(BotOptionItem.id);
            const hasMsgExt = capabilities?.includes(MessageExtensionItem.id);
            if (!hasBot && !hasMsgExt) {
                return err(
                    returnSystemError(
                        new Error("One of bot and Message Extension is expected to be selected"),
                        "Solution",
                        SolutionError.InternelError,
                    ),
                );
            }
        }
        const maybeConfig = this.getConfigForCreatingManifest(ctx.config, false);
        if (maybeConfig.isErr()) {
            return err(maybeConfig.error);
        }

        const {tabEndpoint, tabDomain, aadId, botDomain, botId, webApplicationInfoResource} = maybeConfig.value;

        const validDomains: string[] = [];

        if (tabDomain) {
            validDomains.push(tabDomain);
        }

        if (botDomain) {
            validDomains.push(botDomain);
        }

        return ok(AppStudio.getDevAppDefinition(
            JSON.stringify(manifest),
            aadId,
            validDomains,
            webApplicationInfoResource,
            false,
            tabEndpoint,
            manifest.name.short,
            manifest.version,
            botId,
        ));
    }

    // The assumptions of this function are:
    // 1. this.manifest is not undefined(for azure projects) already contains the latest manifest(loaded via reloadManifestAndCheckRequiredFields)
    // 2. provision of frontend hosting is done and config values has already been loaded into ctx.config
    private async createAndConfigTeamsManifest(ctx: SolutionContext): Promise<Result<IAppDefinition, FxError>> {
        const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (maybeManifest.isErr()) {
            return err(maybeManifest.error);
        }
        const manifest = maybeManifest.value;
        
        let appDefinition: IAppDefinition;
        let updatedManifest: TeamsAppManifest;
        if (this.spfxSelected(ctx)) {
            appDefinition = AppStudio.convertToAppDefinition(manifest, false);
            updatedManifest = manifest;
        } else {
            const result = this.createManifestForRemote(ctx, manifest);
            if (result.isErr()) {
                return err(result.error);
            }
            [appDefinition, updatedManifest] = result.value;
        }
        
        const teamsAppId = ctx.config.get(GLOBAL_CONFIG)?.getString(REMOTE_TEAMS_APP_ID);
        if (!teamsAppId) {
            ctx.logProvider?.info(`Teams app not created`);
            const result = await this.createAndUpdateApp(
                appDefinition,
                "remote",
                ctx.logProvider,
                await ctx.appStudioToken?.getAccessToken(),
                ctx.root,
            );
            if (result.isErr()) {
                return result.map((_) => appDefinition);
            }

            ctx.logProvider?.info(`Teams app created ${result.value}`);
            appDefinition.appId = result.value;
            ctx.config.get(GLOBAL_CONFIG)?.set(REMOTE_TEAMS_APP_ID, result.value);
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
                ctx.root,
            );
            if (result.isErr()) {
                return result.map((_) => appDefinition);
            }
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

        const canProvision = this.checkWhetherSolutionIsIdle();
        if (canProvision.isErr()) {
            return canProvision;
        }
        
        try {
            // Just to trigger M365 login before the concurrent execution of provision. 
            // Because concurrent exectution of provision may getAccessToken() concurrently, which
            // causes 2 M365 logins before the token caching in common lib takes effect.
            await ctx.appStudioToken?.getAccessToken();

            this.runningState = SolutionRunningState.ProvisionInProgress;
            if (this.isAzureProject(ctx)) {
                const maybePermission = await this.getPermissionRequest(ctx);
                if (maybePermission.isErr()) {
                    return maybePermission;
                }
                ctx.config.get(GLOBAL_CONFIG)?.set(PERMISSION_REQUEST, maybePermission.value);
            }   

            const provisionResult = await this.doProvision(ctx);
            if (provisionResult.isOk()) {
                ctx.logProvider?.info(`[Teams Toolkit] provision success!`);
                await ctx.dialog?.communicate(
                    new DialogMsg(DialogType.Show, {
                        description: "[Teams Toolkit] provision success!",
                        level: MsgLevel.Info,
                    }),
                );
                ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
            } else {
                ctx.logProvider?.error(`[Teams Toolkit] provision failed!`);
                ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false);
                const resourceGroupName = ctx.config.get(GLOBAL_CONFIG)?.getString("resourceGroupName");
                const subscriptionId = ctx.config.get(GLOBAL_CONFIG)?.getString("subscriptionId");
                const error = provisionResult.error;
                error.message += " " + util.format(strings.solution.ProvisionFailNotice, subscriptionId, resourceGroupName);
                if(error instanceof UserError){
                    const ue = error as UserError;
                    if(!ue.helpLink){
                        ue.helpLink = "https://aka.ms/teamsfx-solution-help";
                    }
                }
            }
            return provisionResult;
        } finally {
            this.runningState = SolutionRunningState.Idle;
            // Remove permissionRequest to prevent its persistence in config.
            ctx.config.get(GLOBAL_CONFIG)?.delete(PERMISSION_REQUEST);
        }
    }

    /**
     * provision
     */
    async doProvision(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx);
        if (maybeSelectedPlugins.isErr()) {
            return maybeSelectedPlugins;
        }
        const selectedPlugins = maybeSelectedPlugins.value;

        const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (maybeManifest.isErr()) {
            return maybeManifest;
        }
        const manifest = maybeManifest.value;

        if (this.isAzureProject(ctx)) {
            //1. ask common questions for azure resources.
            const appName = manifest.name.short;
            const res = await fillInCommonQuestions(
                ctx,
                appName,
                ctx.config,
                ctx.dialog,
                await ctx.azureAccountProvider?.getAccountCredentialAsync(),
                await ctx.appStudioToken?.getJsonObject(),
            );
            if (res.isErr()) {
                return res;
            }
        }

        const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, selectedPlugins, manifest);
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
                    return aadPlugin.setApplicationInContext(
                        getPluginContext(ctx, this.aadPlugin.name, manifest),
                    );
                    
                }
                return ok(undefined);
            },
            async () => {
                const result = this.createAndConfigTeamsManifest(ctx);
                ctx.logProvider?.info("[Teams Toolkit]: configuration finished!");
                return result;
            },
        );
    }

    private canDeploy(ctx: SolutionContext): Result<Void, FxError> {
        if (!this.isAzureProject(ctx)) {
            return ok(Void);
        }
        return this.checkWhetherSolutionIsIdle().andThen((_) => {
            return this.checkWetherProvisionSucceeded(ctx.config)
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

    private async canPublish(ctx: SolutionContext, manifestTpl: TeamsAppManifest): Promise<Result<TeamsAppManifest, FxError>> {
        const isIdle = this.checkWhetherSolutionIsIdle();
        if (isIdle.isErr()) {
            return err(isIdle.error);
        }

        const isProvisionSucceeded = this.checkWetherProvisionSucceeded(ctx.config);
        if (!isProvisionSucceeded) {
            return err(
                returnUserError(
                    new Error("Please provision before publishing"),
                    "Solution",
                    SolutionError.CannotPublishBeforeProvision,
                ),
            );
        }

        if (this.spfxSelected(ctx)) {
            const manifestString = (await fs.readFile(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)).toString();
            return ok(JSON.parse(manifestString));
        } else {
            return this.createManifestForRemote(ctx, manifestTpl).map((result) => result[1]);
        }
    }

    async deploy(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const canDeploy = this.canDeploy(ctx);
        if (canDeploy.isErr()) {
            return canDeploy;
        }
        try {
            if (this.isAzureProject(ctx)) {
                // Just to trigger M365 login before the concurrent execution of deploy. 
                // Because concurrent exectution of deploy may getAccessToken() concurrently, which
                // causes 2 M365 logins before the token caching in common lib takes effect.
                await ctx.appStudioToken?.getAccessToken();
            }

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
        const res = this.getSelectedPlugins(ctx);
        if (res.isErr()) {
            return res;
        }

        const loadManifestResult = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (loadManifestResult.isErr()) {
            return loadManifestResult;
        }
        const manifest = loadManifestResult.value;

        const optionsToDeploy = ctx.answers?.getStringArray(AzureSolutionQuestionNames.PluginSelectionDeploy);
        if (optionsToDeploy === undefined || optionsToDeploy.length === 0) {
            return err(
                returnUserError(new Error(`No plugin selected`), "Solution", SolutionError.NoResourcePluginSelected),
            );
        }

        const pluginsToDeploy: LoadedPlugin[] = [];
        for (const optionId of optionsToDeploy) {
            const filtered = this.pluginMap.get(optionId);
            if (filtered) {
                pluginsToDeploy.push(filtered);
            }
        }
        ctx.logProvider?.info(
            `[Solution] Selected plugins to deploy:${JSON.stringify(pluginsToDeploy.map((p) => p.name))}`,
        );
        const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, pluginsToDeploy, manifest);
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

        const maybeManifestTpl = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (maybeManifestTpl.isErr()) {
            return err(maybeManifestTpl.error);
        }
        const manifestTpl = maybeManifestTpl.value;

        const maybeManifest = await this.canPublish(ctx, manifestTpl);
        if (maybeManifest.isErr()) {
            return maybeManifest;
        }
        const manifest = maybeManifest.value;
        try {
            this.runningState = SolutionRunningState.PublishInProgress;

            const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, [this.appStudioPlugin], manifest);
            const publishWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
                return [plugin?.publish?.bind(plugin), context, plugin.name];
            });

            ctx.logProvider?.info(`[Solution] publish start!`);

            return await executeConcurrently("", publishWithCtx);
        } finally {
            this.runningState = SolutionRunningState.Idle;
        }
    }

    async getTabScaffoldQuestions(ctx: SolutionContext, addAzureResource: boolean):Promise<Result<QTreeNode | undefined, FxError>> {
        
        const tabNode = new QTreeNode({type:NodeType.group});

        //Frontend plugin
        if (this.fehostPlugin.getQuestions) {
            const pluginCtx = getPluginContext(ctx, this.fehostPlugin.name);
            const res = await this.fehostPlugin.getQuestions(Stage.create, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const frontendNode = res.value as QTreeNode;
                if (frontendNode.data) tabNode.addChild(frontendNode);
            }
        }

        if(addAzureResource){
            const azureResourceNode = new QTreeNode(AzureResourcesQuestion);
            tabNode.addChild(azureResourceNode);
    
            //Azure Function
            if (this.functionPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.functionPlugin.name);
                const res = await this.functionPlugin.getQuestions(Stage.create, pluginCtx);
                if (res.isErr()) return res;
                if (res.value) {
                    const azure_function = res.value as QTreeNode;
                    azure_function.condition = { minItems: 1 };
                    if (azure_function.data) azureResourceNode.addChild(azure_function);
                }
            }
    
            //Azure SQL
            if (this.sqlPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.sqlPlugin.name);
                const res = await this.sqlPlugin.getQuestions(Stage.create, pluginCtx);
                if (res.isErr()) return res;
                if (res.value) {
                    const azure_sql = res.value as QTreeNode;
                    azure_sql.condition = { contains: AzureResourceSQL.id };
                    if (azure_sql.data) azureResourceNode.addChild(azure_sql);
                }
            }
        }
        return ok(tabNode);
    }

    /**
     * collect solution level question
     * @param ctx
     */
    async getQuestions(stage: Stage, ctx: SolutionContext): Promise<Result<QTreeNode | undefined, FxError>> {
        const node = new QTreeNode({ type: NodeType.group });
        let manifest: TeamsAppManifest | undefined = undefined;
        if (stage !== Stage.create) {
            const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
            if (maybeManifest.isErr()) {
                return err(maybeManifest.error);
            }
            manifest = maybeManifest.value;
        }
        
        if (stage === Stage.create) {
            // 1. capabilities
            const capQuestion = createCapabilityQuestion();
            const capNode = new QTreeNode(capQuestion); 
            node.addChild(capNode);

            // 1.1 hostType
            const hostTypeNode = new QTreeNode(FrontendHostTypeQuestion);
            hostTypeNode.condition = {contains:TabOptionItem.id};
            capNode.addChild(hostTypeNode);

            // 1.1.1 SPFX Tab
            if (this.spfxPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.spfxPlugin.name);
                const res = await this.spfxPlugin.getQuestions(Stage.create, pluginCtx);
                if (res.isErr()) return res;
                if (res.value) {
                    const spfxNode = res.value as QTreeNode;
                    spfxNode.condition = { equals: HostTypeOptionSPFx.id };
                    if (spfxNode.data) hostTypeNode.addChild(spfxNode);
                }
            }

            // 1.1.2 Azure Tab
            const tabRes = await this.getTabScaffoldQuestions(ctx, true);
            if (tabRes.isErr()) return tabRes;
            if (tabRes.value) {
                const tabNode = tabRes.value;
                tabNode.condition = { equals: HostTypeOptionAzure.id };
                hostTypeNode.addChild(tabNode);
            }

            // 1.2 Bot
            if (this.botPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.botPlugin.name);
                const res = await this.botPlugin.getQuestions(stage, pluginCtx);
                if (res.isErr()) return res;
                if (res.value) {
                    const botGroup = res.value as QTreeNode;
                    botGroup.condition = { containsAny: [BotOptionItem.id, MessageExtensionItem.id] };
                    capNode.addChild(botGroup);
                }
            }

            // 1.3 Language
            const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
            programmingLanguage.condition = { minItems: 1 };
            capNode.addChild(programmingLanguage);

        } else if (stage === Stage.update) {
            return await this.getQuestionsForAddResource(ctx, manifest);
        } else if (stage === Stage.provision) {
            const checkRes = this.checkWhetherSolutionIsIdle();
            if (checkRes.isErr()) return err(checkRes.error);

            const res = this.getSelectedPlugins(ctx);
            if (res.isErr()) {
                return err(res.error);
            }
            for (const plugin of res.value) {
                if (plugin.getQuestions) {
                    const pluginCtx = getPluginContext(ctx, plugin.name, manifest);
                    const getQuestionRes = await plugin.getQuestions(stage, pluginCtx);
                    if (getQuestionRes.isErr()) return getQuestionRes;
                    if (getQuestionRes.value) {
                        const subnode = getQuestionRes.value as QTreeNode;
                        node.addChild(subnode);
                    }
                }
            }
        } else if (stage === Stage.deploy) {
            const canDeploy = this.canDeploy(ctx);
            if (canDeploy.isErr()) {
                return err(canDeploy.error);
            }
            const res = this.getSelectedPlugins(ctx);
            if (res.isErr()) {
                return err(
                    returnUserError(new Error("No resource to deploy"), "Solution", SolutionError.NoResourceToDeploy),
                );
            }
            const pluginsToDeploy = res.value.filter((plugin) => !!plugin.deploy);
            if(pluginsToDeploy.length === 0){
                return err(
                    returnUserError(new Error("No resource to deploy"), "Solution", SolutionError.NoResourceToDeploy),
                );
            }
            const pluginPrefix = "fx-resource-";
            const options: OptionItem[] = pluginsToDeploy.map((plugin) => {
                const item: OptionItem = { id: plugin.name, label: plugin.displayName, cliName: plugin.name.replace(pluginPrefix, "") };
                return item;
            });
            
            const selectQuestion = DeployPluginSelectQuestion;
            selectQuestion.option = options;
            selectQuestion.default = options.map(i=>i.id);
            const pluginSelection = new QTreeNode(selectQuestion);
            node.addChild(pluginSelection);

            for (const plugin of pluginsToDeploy) {
                if (plugin.getQuestions) {
                    const pluginCtx = getPluginContext(ctx, plugin.name, manifest);
                    const getQuestionRes = await plugin.getQuestions(stage, pluginCtx);
                    if (getQuestionRes.isErr()) return getQuestionRes;
                    if (getQuestionRes.value) {
                        const subnode = getQuestionRes.value as QTreeNode;
                        subnode.condition = { contains: plugin.name };
                        if (subnode.data) pluginSelection.addChild(subnode);
                    }
                }
            }
        } else if (stage === Stage.publish) {
            const pluginsToPublish = [this.appStudioPlugin];
            for (const plugin of pluginsToPublish) {
                const pluginCtx = getPluginContext(ctx, plugin.name, manifest);
                if (plugin.getQuestions) {
                    const getQuestionRes = await plugin.getQuestions(stage, pluginCtx);
                    if (getQuestionRes.isErr()) return getQuestionRes;
                    if (getQuestionRes.value) {
                        const subnode = getQuestionRes.value as QTreeNode;
                        node.addChild(subnode);
                    }
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
        projectRoot?: string,
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
        const colorIconContent = (projectRoot && appDefinition.colorIcon && !appDefinition.colorIcon.startsWith("https://")) ? 
            (await fs.readFile(`${projectRoot}/.${ConfigFolderName}/${appDefinition.colorIcon}`)).toString("base64") : undefined;
        const outlineIconContent = (projectRoot && appDefinition.outlineIcon && !appDefinition.outlineIcon.startsWith("https://")) ? 
            (await fs.readFile(`${projectRoot}/.${ConfigFolderName}/${appDefinition.outlineIcon}`)).toString("base64") : undefined;
        try {
            await AppStudio.updateApp(teamsAppId, appDefinition, appStudioToken, logProvider, colorIconContent, outlineIconContent);
            return ok(teamsAppId);
        } catch (e) {
            if (e instanceof Error) {
                return err(
                    returnSystemError(
                        new Error(`Failed to update ${type} teams app manifest due to ${e.name}: ${e.message}`),
                        "Solution",
                        type === "remote"
                            ? SolutionError.FailedToUpdateAppIdInAppStudio
                            : SolutionError.FailedToUpdateLocalAppIdInAppStudio,
                    ),
                );
            }
            throw e;
        }
    }

    private async createAndUpdateApp(
        appDefinition: IAppDefinition,
        type: "localDebug" | "remote",
        logProvider?: LogProvider,
        appStudioToken?: string,
        projectRoot?: string,
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
        const colorIconContent = (projectRoot && appDefinition.colorIcon && !appDefinition.colorIcon.startsWith("https://")) ? 
            (await fs.readFile(`${projectRoot}/.${ConfigFolderName}/${appDefinition.colorIcon}`)).toString("base64") : undefined;
        const outlineIconContent = (projectRoot && appDefinition.outlineIcon && !appDefinition.outlineIcon.startsWith("https://")) ? 
            (await fs.readFile(`${projectRoot}/.${ConfigFolderName}/${appDefinition.outlineIcon}`)).toString("base64") : undefined;
        const appDef = await AppStudio.createApp(appDefinition, appStudioToken, logProvider, colorIconContent, outlineIconContent);
        const teamsAppId = appDef?.teamsAppId;
        if (appDef === undefined || teamsAppId === undefined) {
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
        appDefinition.outlineIcon = appDef.outlineIcon;
        appDefinition.colorIcon = appDef.colorIcon;

        return this.updateApp(teamsAppId, appDefinition, type, logProvider, appStudioToken, projectRoot);
    }

    async localDebug(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const maybePermission = await this.getPermissionRequest(ctx);
        if (maybePermission.isErr()) {
            return maybePermission;
        }
        try {
            ctx.config.get(GLOBAL_CONFIG)?.set(PERMISSION_REQUEST, maybePermission.value);
            const result = await this.doLocalDebug(ctx);
            return result;
        } finally {
            ctx.config.get(GLOBAL_CONFIG)?.delete(PERMISSION_REQUEST);
        }
    }

    async doLocalDebug(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx);

        if (maybeSelectedPlugins.isErr()) {
            return maybeSelectedPlugins;
        }

        const selectedPlugins = maybeSelectedPlugins.value;
        const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (maybeManifest.isErr()) {
            return err(maybeManifest.error);
        }
        const manifest = maybeManifest.value;

        // Just to trigger M365 login before the concurrent execution of localDebug. 
        // Because concurrent exectution of localDebug may getAccessToken() concurrently, which
        // causes 2 M365 logins before the token caching in common lib takes effect.
        await ctx.appStudioToken?.getAccessToken();

        const pluginsWithCtx: PluginsWithContext[] = this.getPluginAndContextArray(ctx, selectedPlugins, manifest);
        const localDebugWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.localDebug?.bind(plugin), context, plugin.name];
        });
        const postLocalDebugWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(([plugin, context]) => {
            return [plugin?.postLocalDebug?.bind(plugin), context, plugin.name];
        });

        const localDebugResult = await executeConcurrently("", localDebugWithCtx);
        if (localDebugResult.isErr()) {
            return localDebugResult;
        }
        if (selectedPlugins.some((plugin) => plugin.name === this.aadPlugin.name)) {
            const aadPlugin: AadAppForTeamsPlugin = this.aadPlugin as any;
            const result = aadPlugin.setApplicationInContext(getPluginContext(ctx, this.aadPlugin.name, manifest), true);
            if (result.isErr()) {
                return result;
            }
        }
        const result = this.loadTeamsAppTenantId(ctx.config, await ctx.appStudioToken?.getJsonObject());

        if (result.isErr()) {
            return result;
        }
        
        const postLocalDebugResult = await executeConcurrently("post", postLocalDebugWithCtx);
        if (postLocalDebugResult.isErr()) {
            return postLocalDebugResult;
        }

        const maybeConfig = this.getLocalDebugConfig(ctx.config);

        if (maybeConfig.isErr()) {
            return maybeConfig;
        }

        const {localTabEndpoint, localTabDomain, localAADId, localBotDomain, botId, webApplicationInfoResource} = maybeConfig.value;

        const validDomains: string[] = [];

        if (localTabDomain) {
            validDomains.push(localTabDomain);
        }

        if (localBotDomain) {
            validDomains.push(localBotDomain);
        }

        const manifestTpl = (await fs.readFile(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)).toString();
        const [appDefinition, _updatedManifest] = AppStudio.getDevAppDefinition(
            manifestTpl,
            localAADId,
            validDomains,
            webApplicationInfoResource,
            false,
            localTabEndpoint,
            manifest.name.short,
            manifest.version,
            botId,
        );

        const localTeamsAppID = ctx.config.get(GLOBAL_CONFIG)?.getString(LOCAL_DEBUG_TEAMS_APP_ID);
        // If localTeamsAppID is present, we should reuse the teams app id.
        if (localTeamsAppID) {
            const result = await this.updateApp(
                localTeamsAppID, 
                appDefinition, 
                "localDebug", 
                ctx.logProvider, 
                await ctx.appStudioToken?.getAccessToken(),
                ctx.root
            );
            if (result.isErr()) {
                return result;
            }
        } else {
            const maybeTeamsAppId = await this.createAndUpdateApp(
                appDefinition,
                "localDebug",
                ctx.logProvider,
                await ctx.appStudioToken?.getAccessToken(),
                ctx.root,
            );
            if (maybeTeamsAppId.isErr()) {
                return maybeTeamsAppId;
            }
            ctx.config.get(GLOBAL_CONFIG)?.set(LOCAL_DEBUG_TEAMS_APP_ID, maybeTeamsAppId.value);
        }
        return ok(Void);
    }

    private parseTeamsAppTenantId(appStudioToken?: object): Result<string, FxError> {
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
        return ok(teamsAppTenantId);
    }
    private loadTeamsAppTenantId(config: SolutionConfig, appStudioToken?: object): Result<SolutionConfig, FxError> {
        return this.parseTeamsAppTenantId(appStudioToken).andThen((teamsAppTenantId) => {
            config.get(GLOBAL_CONFIG)?.set("teamsAppTenantId", teamsAppTenantId);
            return ok(config);
        });
    }

    private getConfigForCreatingManifest(config: SolutionConfig, localDebug: boolean): Result<{tabEndpoint?: string, tabDomain?:string, aadId: string, botDomain?: string, botId?: string, webApplicationInfoResource: string}, FxError> {
        const tabEndpoint = localDebug ? config.get(this.localDebugPlugin.name)?.getString(LOCAL_DEBUG_TAB_ENDPOINT) : config.get(this.fehostPlugin.name)?.getString(FRONTEND_ENDPOINT);
        const tabDomain = localDebug ? config.get(this.localDebugPlugin.name)?.getString(LOCAL_DEBUG_TAB_DOMAIN) : config.get(this.fehostPlugin.name)?.getString(FRONTEND_DOMAIN);
        const aadId = config.get(this.aadPlugin.name)?.getString(localDebug ? LOCAL_DEBUG_AAD_ID : REMOTE_AAD_ID);
        const botId = config.get(this.botPlugin.name)?.getString(localDebug ? LOCAL_BOT_ID : BOT_ID);
        const botDomain = localDebug ? config.get(this.localDebugPlugin.name)?.getString(LOCAL_DEBUG_BOT_DOMAIN) : config.get(this.botPlugin.name)?.getString(BOT_DOMAIN);
        // This config value is set by aadPlugin.setApplicationInContext. so aadPlugin.setApplicationInContext needs to run first.
        const webApplicationInfoResource = config.get(this.aadPlugin.name)?.getString(localDebug ? LOCAL_WEB_APPLICATION_INFO_SOURCE : WEB_APPLICATION_INFO_SOURCE);
        if (!webApplicationInfoResource) {
            return err(returnSystemError(
                new Error("Failed to get webApplicationInfoResource, make sure you do the provision first."), 
                "Solution", 
                localDebug ? SolutionError.GetLocalDebugConfigError : SolutionError.GetRemoteConfigError));
        }

        if (!aadId) {
            return err(
                returnSystemError(
                    new Error(`config ${LOCAL_DEBUG_AAD_ID} is missing`),
                    "Solution",
                    localDebug ? SolutionError.GetLocalDebugConfigError : SolutionError.GetRemoteConfigError,
                ),
            );
        }
        // localTabEndpoint, bots and composeExtensions can't all be undefined
        if (!tabEndpoint && !botId) {
            return err(
                returnSystemError(
                    new Error(`${localDebug ? LOCAL_DEBUG_TAB_ENDPOINT : FRONTEND_ENDPOINT}, ${localDebug ? LOCAL_BOT_ID : BOT_ID}  are all missing`),
                    "Solution",
                    localDebug ? SolutionError.GetLocalDebugConfigError : SolutionError.GetRemoteConfigError,
                ),
            );
        }
        if ((tabEndpoint && !tabDomain) || (!tabEndpoint && tabDomain)) {
            return err(
                returnSystemError(
                    new Error(`Invalid config for tab: ${localDebug ? LOCAL_DEBUG_TAB_ENDPOINT : FRONTEND_ENDPOINT}=${tabEndpoint} ${localDebug ? LOCAL_DEBUG_TAB_DOMAIN : FRONTEND_DOMAIN}=${tabDomain}`),
                    "Solution",
                    localDebug ? SolutionError.GetLocalDebugConfigError : SolutionError.GetRemoteConfigError,
                ),
            );
        }
        if (botId) {
            if (!botDomain) {
                return err(
                    returnSystemError(
                        new Error(`${localDebug ? LOCAL_DEBUG_BOT_DOMAIN : BOT_DOMAIN} is undefined`),
                        "Solution",
                        localDebug ? SolutionError.GetLocalDebugConfigError : SolutionError.GetRemoteConfigError,
                    )
                );
            }
        }

        
        return ok({tabEndpoint, tabDomain, aadId, botDomain, botId, webApplicationInfoResource});
    }

    private getLocalDebugConfig(config: SolutionConfig): Result<{localTabEndpoint?: string, localTabDomain?:string, localAADId: string, localBotDomain?: string, botId?: string, webApplicationInfoResource: string}, FxError> {
        return this.getConfigForCreatingManifest(config, true).map((conf) => {
            return {
                localTabEndpoint: conf.tabEndpoint,
                localTabDomain: conf.tabDomain,
                localAADId: conf.aadId,
                localBotDomain: conf.botDomain,
                botId: conf.botId,
                webApplicationInfoResource: conf.webApplicationInfoResource,
            };
        });
    }

    async callFunc(func: Func, ctx: SolutionContext): Promise<Result<any, FxError>> {
        const namespace = func.namespace;
        const array = namespace.split("/");
        const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
        const manifest = maybeManifest.isOk() ? maybeManifest.value : undefined;
        if (array.length === 2) {
            const pluginName = array[1];
            const plugin = this.pluginMap.get(pluginName);
            if (plugin && plugin.callFunc) {
                const pctx = getPluginContext(ctx, plugin.name, manifest);
                if (func.method === "aadUpdatePermission") {
                    const result = await this.getPermissionRequest(ctx);
                    if (result.isErr()) {
                        return result;
                    }
                    ctx.config.get(GLOBAL_CONFIG)?.set(PERMISSION_REQUEST, result.value);
                }
                const result = await plugin.callFunc(func, pctx);
                // Remove permissionRequest to prevent its persistence in config.
                ctx.config.get(GLOBAL_CONFIG)?.delete(PERMISSION_REQUEST);
                return result;
            }
        }
        else if(array.length === 1){
            if (func.method === "askSubscription") {
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
                return ok(null);
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

    getAzureSolutionSettings(ctx: SolutionContext):AzureSolutionSettings{
        return ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
    }

    async getQuestionsForAddResource(ctx: SolutionContext, manifest?: TeamsAppManifest): Promise<Result<QTreeNode | undefined, FxError>>{
       
        const settings = this.getAzureSolutionSettings(ctx);

        if(!(settings.hostType === HostTypeOptionAzure.id && settings.capabilities && settings.capabilities.includes(TabOptionItem.id))){
            return err(
                returnUserError(
                    new Error("Add resource is only supported for Tab app hosted in Azure."),
                    "Solution",
                    SolutionError.AddResourceNotSupport,
                ),
            );
        }

        const selectedPlugins = settings.activeResourcePlugins;
        
        if(!selectedPlugins) {
            return err(
                returnUserError(
                    new Error("selectedPlugins is empty"),
                    "Solution",
                    SolutionError.InternelError,
                ),
            );
        }
 
        const alreadyHaveFunction = selectedPlugins.includes(this.functionPlugin.name);
        const alreadyHaveSQL = selectedPlugins.includes(this.sqlPlugin.name);
        const alreadyHaveAPIM = selectedPlugins.includes(this.apimPlugin.name);
        
        const addQuestion = createAddAzureResourceQuestion(alreadyHaveFunction, alreadyHaveSQL, alreadyHaveAPIM);

        const addAzureResourceNode = new QTreeNode(addQuestion);
        
        // there two cases to add function re-scaffold: 1. select add function   2. select add sql and function is not selected when creating
        if (this.functionPlugin.getQuestions) {
            const pluginCtx = getPluginContext(ctx, this.functionPlugin.name, manifest);
            const res = await this.functionPlugin.getQuestions(Stage.update, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const azure_function = res.value as QTreeNode;
                if (alreadyHaveFunction){
                    // if already has function, the question will appear depends on whether user select function, otherwise, the question will always show
                    azure_function.condition = { contains: AzureResourceFunction.id };
                }
                else { // if not function activated, select any option will trigger function question
                    azure_function.condition = { minItems: 1};
                }
                if (azure_function.data) addAzureResourceNode.addChild(azure_function);
            }
        }

        //Azure SQL
        if (this.sqlPlugin.getQuestions && !alreadyHaveSQL) {
            const pluginCtx = getPluginContext(ctx, this.sqlPlugin.name, manifest);
            const res = await this.sqlPlugin.getQuestions(Stage.update, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const azure_sql = res.value as QTreeNode;
                azure_sql.condition = { contains: AzureResourceSQL.id };
                if (azure_sql.data) addAzureResourceNode.addChild(azure_sql);
            }
        }

        //APIM
        if (this.apimPlugin.getQuestions && !alreadyHaveAPIM) {
            const pluginCtx = getPluginContext(ctx, this.apimPlugin.name, manifest);
            const res = await this.apimPlugin.getQuestions(Stage.update, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const groupNode = new QTreeNode({type:NodeType.group});
                groupNode.condition = { contains: AzureResourceApim.id };
                addAzureResourceNode.addChild(groupNode);
                const apim = res.value as QTreeNode;
                if (apim.data){
                    const funcNode =  new QTreeNode(AskSubscriptionQuestion);
                    groupNode.addChild(funcNode);
                    groupNode.addChild(apim);
                } 
            }
        } 
        return ok(addAzureResourceNode);
    }

    async getQuestionsForAddCapability(ctx: SolutionContext, manifest: TeamsAppManifest): Promise<Result<QTreeNode | undefined, FxError>> {
        
        const settings = this.getAzureSolutionSettings(ctx);

        if(!(settings.hostType === HostTypeOptionAzure.id)){
            return err(
                returnUserError(
                    new Error("Add capability is not supported for SPFx project"),
                    "Solution",
                    SolutionError.AddResourceNotSupport,
                ),
            );
        }

        const capabilities = settings.capabilities;

        if(!capabilities) {
            return err(
                returnUserError(
                    new Error("capabilities is empty"),
                    "Solution",
                    SolutionError.InternelError,
                ),
            );
        }
        const alreadyHaveTab = capabilities.includes(TabOptionItem.id);

        const alreadyHaveBotOrMe = capabilities.includes(BotOptionItem.id) || capabilities.includes(MessageExtensionItem.id);

        if (alreadyHaveBotOrMe && alreadyHaveTab) {
            const cannotAddCapWarnMsg = "Your App already has both Tab and Bot/Me, can not Add Capability.";
            await ctx.dialog?.communicate(
                new DialogMsg(DialogType.Show, {
                    description: cannotAddCapWarnMsg,
                    level: MsgLevel.Warning,
                }),
            );
            return ok(undefined);
        }
        
        const addCapQuestion = addCapabilityQuestion(alreadyHaveTab, alreadyHaveBotOrMe);

        const addCapNode = new QTreeNode(addCapQuestion);

        //Tab sub tree
        if(!alreadyHaveTab){
            const tabRes = await this.getTabScaffoldQuestions(ctx, false);
            if (tabRes.isErr()) return tabRes;
            if (tabRes.value) {
                const tabNode = tabRes.value;
                tabNode.condition = { contains: TabOptionItem.id };
                addCapNode.addChild(tabNode);
            }
        }

        //Bot sub tree
        if(!alreadyHaveBotOrMe && this.botPlugin.getQuestions){
            const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
            const pluginCtx = getPluginContext(ctx, this.botPlugin.name, maybeManifest.isOk() ? maybeManifest.value :undefined);
            const res = await this.botPlugin.getQuestions(Stage.create, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const child = res.value as QTreeNode;
                child.condition = { containsAny: [BotOptionItem.id, MessageExtensionItem.id] };
                if (child.data) addCapNode.addChild(child);
            }
        }

        return ok(addCapNode);
    }

    /**
     * user questions for customized task
     */
    async getQuestionsForUserTask(func: Func, ctx: SolutionContext): Promise<Result<QTreeNode | undefined, FxError>> {
        const namespace = func.namespace;
        const array = namespace.split("/");

        const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
        if (maybeManifest.isErr()) {
            return err(maybeManifest.error);
        }
        const manifest = maybeManifest.value;
        if(func.method === "addCapability"){
            return await this.getQuestionsForAddCapability(ctx, manifest);
        }
        if (array.length == 2) {
            const pluginName = array[1];
            const plugin = this.pluginMap.get(pluginName);
            if (plugin) {
                if (plugin.getQuestionsForUserTask) {
                    const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
                    if (maybeManifest.isErr()) {
                        return err(maybeManifest.error);
                    }
                    const manifest = maybeManifest.value;
                    const pctx = getPluginContext(ctx, plugin.name, manifest);
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
    async executeAddResource(ctx: SolutionContext): Promise<Result<any, FxError>> {
        if(!ctx.answers){
            return err(
                returnUserError(
                    new Error(`answer is empty!`),
                    "Solution",
                    SolutionError.InternelError,
                )
            );
        }
        const settings = this.getAzureSolutionSettings(ctx);
        const originalSettings = deepCopy(settings);
        if(!(settings.hostType === HostTypeOptionAzure.id && settings.capabilities && settings.capabilities.includes(TabOptionItem.id))){
            return err(
                returnUserError(
                    new Error("Add resource is only supported for Tab app hosted in Azure."),
                    "Solution",
                    SolutionError.AddResourceNotSupport,
                ),
            );
        }
        const selectedPlugins = settings.activeResourcePlugins;
       
        const alreadyHaveFunction = selectedPlugins?.includes(this.functionPlugin.name);
        const alreadyHaveSql = selectedPlugins?.includes(this.sqlPlugin.name);
        const alreadyHaveApim = selectedPlugins?.includes(this.apimPlugin.name);

        const addResourcesAnswer = ctx.answers?.get(AzureSolutionQuestionNames.AddResources) as string[];

        const addSQL = addResourcesAnswer.includes(AzureResourceSQL.id);
        const addFunc = addResourcesAnswer.includes(AzureResourceFunction.id);
        const addApim = addResourcesAnswer.includes(AzureResourceApim.id);

        if( (alreadyHaveSql && addSQL) || (alreadyHaveApim && addApim) ){
            return err(
                returnUserError(
                    new Error("SQL/APIM is already added."),
                    "Solution",
                    SolutionError.AddResourceNotSupport,
                ),
            );
        }

        const notifications: string[] = [];
        const pluginsToScaffold:LoadedPlugin[] = [this.localDebugPlugin];
        const azureResource = settings.azureResources || [];
        if ( addFunc || ((addSQL || addApim) && !alreadyHaveFunction)) {
            pluginsToScaffold.push(this.functionPlugin);
            azureResource.push(AzureResourceFunction.id);
            notifications.push(AzureResourceFunction.label);
        }
        if (addSQL && !alreadyHaveSql) {
            pluginsToScaffold.push(this.sqlPlugin);
            azureResource.push(AzureResourceSQL.id);
            notifications.push(AzureResourceSQL.label);
        }
        if (addApim && !alreadyHaveApim) {
            pluginsToScaffold.push(this.apimPlugin);
            azureResource.push(AzureResourceApim.id);
            notifications.push(AzureResourceApim.label);
        }
        
        if (notifications.length > 0) {
            this.reloadPlugins(settings);
            ctx.logProvider?.info(`start scaffolding ${notifications.join(",")}.....`);
            const scaffoldRes = await this.doScaffold(ctx, pluginsToScaffold);
            if (scaffoldRes.isErr()) {
                ctx.logProvider?.info(`failed to scaffold ${notifications.join(",")}!`);
                ctx.projectSettings!.solutionSettings = originalSettings;
                return err(scaffoldRes.error);
            }
            ctx.logProvider?.info(`finish scaffolding ${notifications.join(",")}!`);
            ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false); //if selected plugin changed, we need to re-do provision
            await ctx.dialog?.communicate(
                new DialogMsg(DialogType.Show, {
                    description: util.format(strings.solution.AddResourceNotice, notifications.join(",")),
                    level: MsgLevel.Info,
                }),
            );
        }
        return ok(Void);
    }
    async executeAddCapability(func: Func, ctx: SolutionContext): Promise<Result<any, FxError>> {
        if(!ctx.answers){
            return err(
                returnUserError(
                    new Error(`answer is emtry!`),
                    "Solution",
                    SolutionError.InternelError,
                )
            );
        }
        const settings = this.getAzureSolutionSettings(ctx);
        const originalSettings = deepCopy(settings);
        if(!(settings.hostType === HostTypeOptionAzure.id)){
            return err(
                returnUserError(
                    new Error("Add capability is not supported for SPFx project"),
                    "Solution",
                    SolutionError.FailedToAddCapability,
                ),
            );
        }

        const capabilitiesAnswer = ctx.answers.getStringArray(AzureSolutionQuestionNames.Capabilities);
        if(!capabilitiesAnswer || capabilitiesAnswer.length === 0){
            return ok(Void);
        }

        if( ( settings.capabilities?.includes(BotOptionItem.id) || settings.capabilities?.includes(MessageExtensionItem.id) ) 
            && ( capabilitiesAnswer.includes(BotOptionItem.id) || capabilitiesAnswer.includes(MessageExtensionItem.id) ) ){
            return err(
                returnUserError(
                    new Error("Application already contains a Bot and/or Message Extension"),
                    "Solution",
                    SolutionError.FailedToAddCapability,
                ),
            );
        }

        let change = false;
        const notifications:string[]  = [];
        const pluginsToScaffold:LoadedPlugin[] = [this.localDebugPlugin];
        for(const cap of capabilitiesAnswer!){
            if(!settings.capabilities.includes(cap)){
                settings.capabilities.push(cap);
                change = true;
                if(cap === TabOptionItem.id){
                    notifications.push("Azure Tab Frontend");
                    pluginsToScaffold.push(this.fehostPlugin);
                }
                else if((cap === BotOptionItem.id || cap === MessageExtensionItem.id) && !pluginsToScaffold.includes(this.botPlugin)){
                    notifications.push("Bot/MessageExtension");
                    pluginsToScaffold.push(this.botPlugin);
                }
            }
        }

        if(change){
            this.reloadPlugins(settings);
            if (this.isAzureProject(ctx)) {
                const manifest = await AppStudio.createManifest(ctx.projectSettings!);
                if (manifest) Object.assign(ctx.app, manifest);
                await fs.writeFile(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`, JSON.stringify(manifest, null, 4));
                await fs.writeJSON(`${ctx.root}/permissions.json`, DEFAULT_PERMISSION_REQUEST, { spaces: 4 });
            } else {
                const manifest = await ((this.spfxPlugin as unknown) as SpfxPlugin).getManifest();
                await fs.writeFile(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`, JSON.stringify(manifest, null, 4));
            }
            ctx.logProvider?.info(`start scaffolding ${notifications.join(",")}.....`);
            const scaffoldRes = await this.doScaffold(ctx, pluginsToScaffold);
            if (scaffoldRes.isErr()) {
                ctx.logProvider?.info(`failed to scaffold ${notifications.join(",")}!`);
                ctx.projectSettings!.solutionSettings = originalSettings;
                return err(scaffoldRes.error);
            }
            ctx.logProvider?.info(`finish scaffolding ${notifications.join(",")}!`);
            ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false); 
            await ctx.dialog?.communicate(
                new DialogMsg(DialogType.Show, {
                    description: util.format(strings.solution.AddCapabilityNotice, notifications.join(",")),
                    level: MsgLevel.Info,
                }),
            );
            return ok({});
        }
        const cannotAddCapWarnMsg = "Add nothing";
        await ctx.dialog?.communicate(
            new DialogMsg(DialogType.Show, {
                description: cannotAddCapWarnMsg,
                level: MsgLevel.Warning,
            }),
        );
        return ok({});
    }
    /**
     * execute user task
     */
    async executeUserTask(func: Func, ctx: SolutionContext): Promise<Result<any, FxError>> {
        const namespace = func.namespace;
        const method = func.method;
        const array = namespace.split("/");
        if(method === "addCapability"){
            return await this.executeAddCapability(func, ctx);
        }
        if (namespace.includes("solution")) {
            if (method === "registerTeamsAppAndAad") {
                const maybeParams = this.extractParamForRegisterTeamsAppAndAad(ctx.answers);
                if (maybeParams.isErr()) {
                    return maybeParams;
                }
                return this.registerTeamsAppAndAad(ctx, maybeParams.value);
            } else if (method === "VSpublish") {
                // VSpublish means VS calling cli to do publish. It is different than normal cli work flow
                // It's teamsfx init followed by teamsfx  publish without running provision.
                // Using executeUserTask here could bypass the fx project check.
                if (ctx.platform !== "vs") {
                    return err(
                        returnSystemError(new Error(`VS publish is not supposed to run on platform ${ctx.platform}`), 
                        "Solution", 
                        SolutionError.UnsupportedPlatform));
                }
                const appStudioPlugin: AppStudioPlugin = this.appStudioPlugin as any;
                const pluginCtx = getPluginContext(ctx, this.appStudioPlugin.name);
                return appStudioPlugin.publish(pluginCtx);
            } else if (method === "validateManifest") {
                const appStudioPlugin: AppStudioPlugin = this.appStudioPlugin as any;
                const pluginCtx = getPluginContext(ctx, this.appStudioPlugin.name);

                let manifestString: string | undefined = undefined;
                if (this.spfxSelected(ctx)) {
                    manifestString = (await fs.readFile(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)).toString();
                } else {
                    const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
                    if (maybeManifest.isErr()) {
                        return maybeManifest;
                    }
                    const manifestTpl = maybeManifest.value;
                    const manifest = this.createManifestForRemote(ctx, manifestTpl).map((result) => result[1]);
                    if (manifest.isOk()) {
                        manifestString = JSON.stringify(manifest.value);
                    } else {
                        ctx.logProvider?.error("[Teams Toolkit] Manifest Validation failed!");
                        await ctx.dialog?.communicate(
                            new DialogMsg(DialogType.Show, {
                                description: manifest.error.message,
                                level: MsgLevel.Error,
                            }),
                        );
                        return err(manifest.error);
                    }
                }
                return await appStudioPlugin.validateManifest(pluginCtx, manifestString);
            } else if (method === "buildPackage") {
                const appStudioPlugin: AppStudioPlugin = this.appStudioPlugin as any;
                const pluginCtx = getPluginContext(ctx, this.appStudioPlugin.name);

                let manifestString: string | undefined = undefined;

                if (this.spfxSelected(ctx)) {
                    manifestString = (await fs.readFile(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)).toString();
                } else {
                    const manifestTpl: TeamsAppManifest = await fs.readJSON(`${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`);
                    const manifest = this.createManifestForRemote(ctx, manifestTpl).map((result) => result[1]);
                    if (manifest.isOk()) {
                        manifestString = JSON.stringify(manifest.value);
                    } else {
                        ctx.logProvider?.error("[Teams Toolkit] Teams Package built failed!");
                        await ctx.dialog?.communicate(
                            new DialogMsg(DialogType.Show, {
                                description: manifest.error.message,
                                level: MsgLevel.Error,
                            }),
                        );
                        return err(manifest.error);
                    }
                }
                return await appStudioPlugin.buildTeamsPackage(pluginCtx, `${ctx.root}/.${ConfigFolderName}`, manifestString);
            } else if (method === "aadUpdatePermission" && array.length == 2) {
                const pluginName = array[1];
                const plugin = this.pluginMap.get(pluginName);
                if (plugin && plugin.executeUserTask) {

                    const maybeManifest = await this.reloadManifestAndCheckRequiredFields(ctx);
                    if (maybeManifest.isErr()) {
                        return maybeManifest;
                    }
                    const manifestTpl = maybeManifest.value;

                    const pctx = getPluginContext(ctx, plugin.name, manifestTpl);
                    let result = await this.getPermissionRequest(ctx);
                    if (result.isErr()) {
                        return result;
                    }
                    ctx.config.get(GLOBAL_CONFIG)?.set(PERMISSION_REQUEST, result.value);
                    result = await plugin.executeUserTask(func, pctx);
                    // Remove permissionRequest to prevent its persistence in config.
                    ctx.config.get(GLOBAL_CONFIG)?.delete(PERMISSION_REQUEST);
                    return result;
                }
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

    private extractParamForRegisterTeamsAppAndAad(
        answers?: ConfigMap,
    ): Result<ParamForRegisterTeamsAppAndAad, FxError> {
        if (answers == undefined) {
            return err(
                returnSystemError(
                    new Error("Input is undefined"),
                    "Solution",
                    SolutionError.FailedToGetParamForRegisterTeamsAppAndAad,
                ),
            );
        }

        const param: ParamForRegisterTeamsAppAndAad = {
            "app-name": "",
            endpoint: "",
            environment: "local",
            "root-path": "",
        };
        for (const key of Object.keys(param)) {
            const value = answers.getString(key);
            if (value == undefined) {
                return err(
                    returnSystemError(
                        new Error(`${key} not found`),
                        "Solution",
                        SolutionError.FailedToGetParamForRegisterTeamsAppAndAad,
                    ),
                );
            }
            (param as any)[key] = value;
        }

        return ok(param);
    }

    private prepareConfigForRegisterTeamsAppAndAad(
        config: SolutionConfig,
        params: ParamForRegisterTeamsAppAndAad,
    ): string {
        const endpoint = params.endpoint;
        const domain = new URL(endpoint).hostname;

        if (config.get(GLOBAL_CONFIG) == undefined) {
            config.set(GLOBAL_CONFIG, new ConfigMap());
        }
        config.get(GLOBAL_CONFIG)!.set(PERMISSION_REQUEST, JSON.stringify(DEFAULT_PERMISSION_REQUEST));

        if (config.get(this.aadPlugin.name) == undefined) {
            config.set(this.aadPlugin.name, new ConfigMap());
        }
        config.get(this.aadPlugin.name)!.set("domain", domain);
        config.get(this.aadPlugin.name)!.set("endpoint", endpoint);
        return domain;
    }

    private extractConfigForRegisterTeamsAppAndAad(config: SolutionConfig, isLocal: boolean): Result<{ aadId: string, applicationIdUri: string, clientSecret: string }, FxError> {
        const aadId = config.get(this.aadPlugin.name)?.get(isLocal ? LOCAL_DEBUG_AAD_ID : REMOTE_AAD_ID);
        if (aadId === undefined || typeof aadId !== "string") {
            return err(
                returnSystemError(
                    new Error(`config ${LOCAL_DEBUG_AAD_ID} is missing`),
                    "Solution",
                    SolutionError.RegisterTeamsAppAndAadError,
                ),
            );
        }
        const applicationIdUri = config.get(this.aadPlugin.name)?.get(isLocal ? LOCAL_APPLICATION_ID_URIS : REMOTE_APPLICATION_ID_URIS);
        if (applicationIdUri === undefined || typeof applicationIdUri !== "string") {
            return err(
                returnSystemError(
                    new Error(`config ${LOCAL_APPLICATION_ID_URIS} is missing`),
                    "Solution",
                    SolutionError.RegisterTeamsAppAndAadError,
                ),
            );
        }
        const clientSecret = config.get(this.aadPlugin.name)?.get(isLocal ? LOCAL_CLIENT_SECRET : REMOTE_CLIENT_SECRET);
        if (clientSecret === undefined || typeof clientSecret !== "string") {
            return err(
                returnSystemError(
                    new Error(`config ${LOCAL_CLIENT_SECRET} is missing`),
                    "Solution",
                    SolutionError.RegisterTeamsAppAndAadError,
                ),
            );
        }
        return ok({
            aadId,
            applicationIdUri,
            clientSecret
        });
    }

    /**
     * This function is only called by cli: teamsfx init. The context may be different from that of vsc: no .${ConfigFolderName} folder, no permissions.json
     * In order to reuse aad plugin, we need to pretend we are still in vsc context. Currently, we don't support icons, because icons are not included in the
     * current contract.
     */
    private async registerTeamsAppAndAad(
        ctx: SolutionContext,
        params: ParamForRegisterTeamsAppAndAad,
    ): Promise<
        Result<
            { teamsAppId: string; clientId: string; clientSecret: string; tenantId: string; applicationIdUri: string },
            FxError
        >
    > {
        const rootPath = params["root-path"];
        const isLocal: boolean = params.environment === "local";
        const mockedManifest = new TeamsAppManifest();
        mockedManifest.name.short = params["app-name"];
        const domain = this.prepareConfigForRegisterTeamsAppAndAad(ctx.config, params);
        const aadPluginCtx = getPluginContext(ctx, this.aadPlugin.name, mockedManifest);
        const aadPlugin: AadAppForTeamsPlugin = this.aadPlugin as any;

        const provisionResult = isLocal ? await aadPlugin.localDebug(aadPluginCtx) : await aadPlugin.provision(aadPluginCtx);
        if (provisionResult.isErr()) {
            return provisionResult;
        }
        aadPlugin.setApplicationInContext(aadPluginCtx, isLocal);
        const postProvisionResult = isLocal ? await aadPlugin.postLocalDebug(aadPluginCtx) : await aadPlugin.postProvision(aadPluginCtx);
        if (postProvisionResult.isErr()) {
            return postProvisionResult;
        }

        const configResult = this.extractConfigForRegisterTeamsAppAndAad(ctx.config, isLocal);
        if (configResult.isErr()) {
            return err(configResult.error);
        }

        const manifestPath: string = path.join(rootPath, "manifest", isLocal ? "local" : "remote", "manifest.json");
        const appSettingsJSONPath = path.join(rootPath, "blazor-server-tabs", isLocal ? "appsettings.Development.json" : "appsettings.json");

        const manifestTpl = (await fs.readFile(manifestPath)).toString();
        const manifestStr: string = Mustache.render(manifestTpl, {
            "client-id": configResult.value.aadId,
            "app-name": params["app-name"],
            endpoint: params.endpoint,
            domain: domain,
            "application-id-uri": configResult.value.applicationIdUri,
        });
        const manifest: TeamsAppManifest = JSON.parse(manifestStr);
        await fs.writeFile(manifestPath, manifestStr);
        const appDefinition = AppStudio.convertToAppDefinition(manifest, true);
        const maybeTeamsAppId = await this.createAndUpdateApp(
            appDefinition,
            "remote",
            ctx.logProvider,
            await ctx.appStudioToken?.getAccessToken(),
        );
        if (maybeTeamsAppId.isErr()) {
            return err(maybeTeamsAppId.error);
        }
        const teamsAppId = maybeTeamsAppId.value;

        const appSettingsJSONTpl = (await fs.readFile(appSettingsJSONPath)).toString();
        const maybeTenantId = this.parseTeamsAppTenantId(await ctx.appStudioToken?.getJsonObject());
        if (maybeTenantId.isErr()) {
            return err(maybeTenantId.error);
        }
        const appSettingsJSON = Mustache.render(appSettingsJSONTpl, { "client-id": configResult.value.aadId, "client-secret": configResult.value.clientSecret, "application-id-uri": configResult.value.applicationIdUri, "endpoint": params.endpoint, "tenant-id": maybeTenantId.value, });
        await fs.writeFile(appSettingsJSONPath, appSettingsJSON);

        if (isLocal) {
            const launchSettingsJSONPath: string = path.join(rootPath, "blazor-server-tabs", "Properties", "launchSettings.json");
            const launchSettingsJSONTpl = (await fs.readFile(launchSettingsJSONPath)).toString();
            const launchSettingsJSON = Mustache.render(launchSettingsJSONTpl, { "teams-app-id": teamsAppId });
            await fs.writeFile(launchSettingsJSONPath, launchSettingsJSON);
        }
        // Remove permissionRequest to prevent its persistence in config.
        ctx.config.get(GLOBAL_CONFIG)?.delete(PERMISSION_REQUEST);
        return ok({
            teamsAppId: teamsAppId,
            clientId: configResult.value.aadId,
            clientSecret: configResult.value.clientSecret,
            tenantId: maybeTenantId.value,
            applicationIdUri: configResult.value.applicationIdUri
        });

    }
}
