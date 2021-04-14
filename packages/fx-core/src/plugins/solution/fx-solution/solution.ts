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
    SystemError,
    DialogMsg,
    DialogType,
    TeamsAppManifest,
    LogProvider,
    OptionItem,
    MsgLevel,
    ConfigFolderName,
    Platform,
    AzureSolutionSettings
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
    AAD_REMOTE_CLIENT_ID,
    TEAMS_APP_MANIFEST_TEMPLATE,
    REMOTE_TEAMS_APP_ID,
    Void,
    SOLUTION_PROVISION_SUCCEEDED,
    BOTS,
    COMPOSE_EXTENSIONS,
    BOT_DOMAIN,
    LOCAL_APPLICATION_ID_URIS,
    LOCAL_CLIENT_SECRET,
    LOCAL_DEBUG_BOT_DOMAIN,
    REMOTE_AAD_ID,
    REMOTE_APPLICATION_ID_URIS,
    REMOTE_CLIENT_SECRET,
    WEB_APPLICATION_INFO_SOURCE,
    LOCAL_WEB_APPLICATION_INFO_SOURCE,
    PROVISION_MANIFEST,
    PROGRAMMING_LANGUAGE
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
    TabScopQuestion,
    MessageExtensionItem,
    AzureResourceApim,
    createCapabilityQuestion,
    createAddAzureResourceQuestion,
    AskSubscriptionQuestion,
    createAddCapabilityQuestion,
    ProgrammingLanguageQuestion,
} from "./question";
import Mustache from "mustache";
import path from "path";
import { AppStudioPlugin } from "../../resource/appstudio";

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
    pluginWithMeta.name = "fx-resource-teamsbot";
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
    // For SPFx projects, there is no manifest.
    manifest?: TeamsAppManifest;

    constructor() {
        for (const plugin of this.allPlugins) {
            this.pluginMap.set(plugin.name, plugin);
        }
        this.runningState = SolutionRunningState.Idle;
    }

    private getPluginAndContextArray(ctx: SolutionContext, selectedPlugins: LoadedPlugin[], manifest?: TeamsAppManifest): PluginsWithContext[] {
        // let pluginContextConstructor = getPluginContextConstructor(ctx);
        return selectedPlugins.map((plugin) => [plugin, getPluginContext(ctx, plugin.name, manifest ?? this.manifest)]);
    }

    async init(ctx: SolutionContext): Promise<Result<any, FxError>> {
        return ok({});
    }

    fillInSolutionSettings(ctx: SolutionContext): Result<any, FxError> {
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

        const capabilities = answers.getStringArray(AzureSolutionQuestionNames.Capabilities);
        if(!capabilities){
            return err(
                returnSystemError(
                    new Error("capabilities is undefined"),
                    "Solution",
                    SolutionError.InternelError,
                ),
            );
        }
        const hostType = answers.getString(AzureSolutionQuestionNames.HostType);
        const azureResources = answers.getStringArray(AzureSolutionQuestionNames.AzureResources);

        if(azureResources){
            if( (azureResources.includes(AzureResourceSQL.id) || azureResources.includes(AzureResourceApim.id)) && !azureResources.includes(AzureResourceFunction.id)){
                azureResources.push(AzureResourceFunction.id);
            }
        }

        const solutionSettings:AzureSolutionSettings = {
            name: projectSettings.solutionSettings.name,
            version: projectSettings.solutionSettings.version,
            capabilities : capabilities,
            hostType: hostType,
            azureResources: azureResources,
            activeResourcePlugins:[]
        }; 
        projectSettings.solutionSettings = solutionSettings;
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
        const lang = ctx.answers?.getString(AzureSolutionQuestionNames.ProgrammingLanguage);
        ctx.config.get(GLOBAL_CONFIG)?.set(PROGRAMMING_LANGUAGE, lang ?? "javascript");

        const settingsRes = this.fillInSolutionSettings(ctx);
        if(settingsRes.isErr()) 
            return settingsRes;

        //Reload plugins according to user answers
        this.reloadPlugins(ctx);

        const defaultIconPath = path.join(__dirname, "../../../../templates/plugins/solution/defaultIcon.png");
        await fs.copy(defaultIconPath, `${ctx.root}/.${ConfigFolderName}/color.png`);
        await fs.copy(defaultIconPath, `${ctx.root}/.${ConfigFolderName}/outline.png`);
        if (!this.spfxSelected(ctx)) {
            this.manifest = await AppStudio.createManifest(ctx.answers);
            if (this.manifest) Object.assign(ctx.app, this.manifest);
            await fs.writeFile(`${ctx.root}/.${ConfigFolderName}/manifest.remote.json`, JSON.stringify(this.manifest, null, 4));
            await fs.writeJSON(`${ctx.root}/permissions.json`, DEFAULT_PERMISSION_REQUEST, { spaces: 4 });
            return this.updatePermissionRequest(ctx);
        } else {
            this.manifest = await ((this.spfxPlugin as unknown) as SpfxPlugin).getManifest();
            await fs.writeFile(`${ctx.root}/.${ConfigFolderName}/manifest.remote.json`, JSON.stringify(this.manifest, null, 4));
            return ok(null);
        }
    }

    async open(ctx: SolutionContext): Promise<Result<any, FxError>> {
        return this.reloadManifestAndCheckRequiredFields(ctx);
    }

    private async reloadManifest(ctx: SolutionContext): Promise<Result<any, FxError>> {
        // read manifest
        if (!this.spfxSelected(ctx)) {
            try {
                this.manifest = await fs.readJson(`${ctx.root}/.${ConfigFolderName}/manifest.remote.json`);
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
        if (!this.spfxSelected(ctx)) {
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

    reloadPlugins(ctx: SolutionContext): void {
        
        const solutionSettings: AzureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;

        const cap = solutionSettings.capabilities;

        const pluginNameSet = new Set<string>();
        pluginNameSet.add(this.localDebugPlugin.name);

        if (cap.includes(TabOptionItem.label)) {
            const frontendHostType = solutionSettings.hostType;
            if (HostTypeOptionAzure.label === frontendHostType) {
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
            } else if (HostTypeOptionSPFx.label === frontendHostType) {
                pluginNameSet.add(this.spfxPlugin.name);
            }
        }

        if (cap.includes(BotOptionItem.id) || cap.includes(MessageExtensionItem.id)) {
            // Bot/Message extension plugin depend on aad plugin.
            // Currently, Bot and Message Extension features are both implemented in botPlugin
            pluginNameSet.add(this.botPlugin.name);
            pluginNameSet.add(this.aadPlugin.name);
        }

        solutionSettings.activeResourcePlugins = Array.from(pluginNameSet);
    }

    private spfxSelected(ctx: SolutionContext): boolean {
        // Generally, if SPFx is selected, there should be no other plugins. But we don't check this invariant here.
        const spfxExists = this.getAzureSolutionSettings(ctx).activeResourcePlugins.some((pluginName) => pluginName === this.spfxPlugin.name);
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
        const settings = this.getAzureSolutionSettings(ctx);
        const selectedPlugins = settings.activeResourcePlugins;
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

        const addResourcesInQuestion = ctx.answers?.get(AzureSolutionQuestionNames.AddResources) as string[];

        const addSQL = addResourcesInQuestion.includes(AzureResourceSQL.label);
        const addFunc = addResourcesInQuestion.includes(AzureResourceFunction.label);
        const addApim = addResourcesInQuestion.includes(AzureResourceApim.label);

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

            // Scaffold apim
            ctx.logProvider?.info(`start scaffolding API Management .....`);
            const result = await this.scaffoldOne(this.apimPlugin, ctx);
            if (result.isErr()) {
                ctx.logProvider?.info(`failed to scaffold API Management!`);
                return err(result.error);
            }
            ctx.logProvider?.info(`finish scaffolding API Management!`);
            addResourceItemsForNotification.push(AzureResourceApim.description!);
        }

        if (addResourceItemsForNotification.length > 0) {
            // add azureResources and reload plugins
            let reloadPlugin = false;
            for (const item of addResourceForPlugin) {
                if (!settings.azureResources?.includes(item)) {
                    settings.azureResources?.push(item);
                    reloadPlugin = true;
                }
            }
            if (reloadPlugin) {
                this.reloadPlugins(ctx);
                ctx.logProvider?.info(`start scaffolding Local Debug Configs.....`);
                const scaffoldRes = await this.scaffoldOne(this.localDebugPlugin, ctx);
                if (scaffoldRes.isErr()) {
                    ctx.logProvider?.info(`failed to scaffold Debug Configs!`);
                    return err(scaffoldRes.error);
                }
                ctx.logProvider?.info(`finish scaffolding Local Debug Configs!`);

                ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false); //if selected plugin changed, we need to re-do provision
            }
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
        ctx:SolutionContext
    ): Promise<Result<SolutionConfig, FxError>> {
        if (this.spfxSelected(ctx)) {
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
        const permissionRequest = await fs.readJson(path);
        ctx.config.get(GLOBAL_CONFIG)?.set(PERMISSION_REQUEST, JSON.stringify(permissionRequest));
        return ok(ctx.config);
    }

    // The assumptions of this function are:
    // 1. this.manifest is not undefined(for azure projects) already contains the latest manifest(loaded via reloadManifestAndCheckRequiredFields)
    // 2. provision of frontend hosting is done and config values has already been loaded into ctx.config
    private async createAndConfigTeamsManifest(ctx: SolutionContext): Promise<Result<IAppDefinition, FxError>> {
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx);
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

        const manifest = await fs.readJSON(`${ctx.root}/.${ConfigFolderName}/manifest.remote.json`);
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

        const validDomains: string[] = [];
        if (domain) {
            validDomains.push(domain);
        }

        const validBotDomain = ctx.config.get(this.botPlugin.name)?.get(BOT_DOMAIN);
        if (validBotDomain) {
            validDomains.push(validBotDomain as string);
        }

        const webApplicationInfoResource: string | undefined = ctx.config.get(this.aadPlugin.name)?.getString(WEB_APPLICATION_INFO_SOURCE);
        if (webApplicationInfoResource) {
            ctx.logProvider?.debug(`Succeed to get webApplicationInfoResource: ${webApplicationInfoResource}`);
        } else {
            ctx.logProvider?.debug(`Failed to get webApplicationInfoResource from aad by key ${WEB_APPLICATION_INFO_SOURCE}.`);
            return err(returnSystemError(new Error("Failed to get webApplicationInfoResource"), "Solution", SolutionError.UpdateManifestError));
        }

        const [appDefinition, updatedManifest] = AppStudio.getDevAppDefinition(
            manifestString,
            clientId,
            validDomains,
            webApplicationInfoResource,
            endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length - 1) : endpoint,
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
            ctx.config.get(GLOBAL_CONFIG)?.set(PROVISION_MANIFEST, JSON.stringify(updatedManifest));
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
            ctx.config.get(GLOBAL_CONFIG)?.set(PROVISION_MANIFEST, JSON.stringify(updatedManifest));
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
        if (this.spfxSelected(ctx)) {
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
            // Just to trigger M365 login before the concurrent execution of provision. 
            // Because concurrent exectution of provision may getAccessToken() concurrently, which
            // causes 2 M365 logins before the token caching in common lib takes effect.
            await ctx.appStudioToken?.getAccessToken();

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
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx);
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

        res = await this.updatePermissionRequest(ctx);
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

    private canDeploy(ctx: SolutionContext): Result<Void, FxError> {
        if (this.spfxSelected(ctx)) {
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

    private canPublish(solutionConfig: SolutionConfig, platform?: Platform): Result<TeamsAppManifest | undefined, FxError> {
        // Note this is a temporary solution to support VS calling CLI, which is not a normal teamsfx publish workflow. The manifest
        // will not be generated by provision.
        if (platform !== "vsc") {
            return ok(undefined);
        }
        return this.checkWhetherSolutionIsIdle().andThen((_) => {
            return this.checkWetherProvisionSucceeded(solutionConfig)
                ? ok(Void)
                : err(
                    returnUserError(
                        new Error("Please provision before publishing"),
                        "Solution",
                        SolutionError.CannotPublishBeforeProvision,
                    ),
                );
        }).andThen((_) => {
            const manifestString = solutionConfig.get(GLOBAL_CONFIG)?.getString(PROVISION_MANIFEST);
            if (!manifestString) {
                return err(
                    returnSystemError(
                        new Error("Teams app manifest not found"),
                        "Solution",
                        SolutionError.CannotPublishBeforeProvision
                    )
                );
            }
            return ok(JSON.parse(manifestString));
        });
    }

    async deploy(ctx: SolutionContext): Promise<Result<any, FxError>> {
        const canDeploy = this.canDeploy(ctx);
        if (canDeploy.isErr()) {
            return canDeploy;
        }
        try {
            if (!this.spfxSelected(ctx)) {
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
        if (this.spfxSelected(ctx)) {
            return err(
                returnUserError(
                    new Error("Cannot publish for SPFx projects"),
                    "Solution",
                    SolutionError.CannotRunThisTaskInSPFxProject,
                ),
            );
        }

        const maybeManifest = this.canPublish(ctx.config, ctx.platform);
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

            const result = await executeConcurrently(publishWithCtx);

            if (result.isOk()) {
                ctx.logProvider?.info(`[Teams Toolkit] publish success!`);
                await ctx.dialog?.communicate(
                    new DialogMsg(DialogType.Show, {
                        description: `[Teams Toolkit]: ${ctx.app.name.short} successfully published to the admin portal. Once approved, your app will be available for your organization.`,
                        level: MsgLevel.Info,
                    }),
                );
            } else {
                ctx.logProvider?.error(`[Teams Toolkit] publish failed!`);
            }

            return result;
        } finally {
            this.runningState = SolutionRunningState.Idle;
        }
    }

    async getTabScaffoldQuestions(ctx: SolutionContext):Promise<Result<QTreeNode | undefined, FxError>> {
        const tabNode = new QTreeNode({ type: NodeType.group });
       
        const tab_scope = new QTreeNode(TabScopQuestion);
        tabNode.addChild(tab_scope);

        const frontend_host_type = new QTreeNode(FrontendHostTypeQuestion);
        tabNode.addChild(frontend_host_type);

        //Frontend plugin
        if (this.fehostPlugin.getQuestions) {
            const pluginCtx = getPluginContext(ctx, this.fehostPlugin.name);
            const res = await this.fehostPlugin.getQuestions(Stage.create, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const frontend = res.value as QTreeNode;
                frontend.condition = { equals: HostTypeOptionAzure.label };
                if (frontend.data) frontend_host_type.addChild(frontend);
            }
        }

        const azure_resources = new QTreeNode(AzureResourcesQuestion);
        azure_resources.condition = { equals: HostTypeOptionAzure.label };
        frontend_host_type.addChild(azure_resources);

        //SPFX plugin
        if (this.spfxPlugin.getQuestions) {
            const pluginCtx = getPluginContext(ctx, this.spfxPlugin.name);
            const res = await this.spfxPlugin.getQuestions(Stage.create, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const spfx = res.value as QTreeNode;
                spfx.condition = { equals: HostTypeOptionSPFx.label };
                if (spfx.data) frontend_host_type.addChild(spfx);
            }
        }

        //Azure Function
        if (this.functionPlugin.getQuestions) {
            const pluginCtx = getPluginContext(ctx, this.functionPlugin.name, this.manifest);
            const res = await this.functionPlugin.getQuestions(Stage.create, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const azure_function = res.value as QTreeNode;
                azure_function.condition = { minItems: 1 };
                if (azure_function.data) azure_resources.addChild(azure_function);
            }
        }

        //Azure SQL
        if (this.sqlPlugin.getQuestions) {
            const pluginCtx = getPluginContext(ctx, this.sqlPlugin.name, this.manifest);
            const res = await this.sqlPlugin.getQuestions(Stage.create, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const azure_sql = res.value as QTreeNode;
                azure_sql.condition = { contains: AzureResourceSQL.label };
                if (azure_sql.data) azure_resources.addChild(azure_sql);
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
        if (stage === Stage.create) {
            const capQuestion = createCapabilityQuestion(true);
 
            const capNode = new QTreeNode(capQuestion); 

            node.addChild(capNode);
            
            node.addChild(new QTreeNode(ProgrammingLanguageQuestion));

            /////Tab
            const tabRes = await this.getTabScaffoldQuestions(ctx);
            if (tabRes.isErr()) return tabRes;
            if (tabRes.value) {
                const tabNode = tabRes.value;
                tabNode.condition = { contains: TabOptionItem.id };
                capNode.addChild(tabNode);
            }

            ////Bot
            if (this.botPlugin.getQuestions) {
                const pluginCtx = getPluginContext(ctx, this.botPlugin.name, this.manifest);
                const res = await this.botPlugin.getQuestions(stage, pluginCtx);
                if (res.isErr()) return res;
                if (res.value) {
                    const botGroup = res.value as QTreeNode;
                    botGroup.condition = { containsAny: [BotOptionItem.id, MessageExtensionItem.id] };
                    capNode.addChild(botGroup);
                }
            }
        } else if (stage === Stage.update) {
            
            return await this.getQuestionsForAddResource(ctx);
        
        } else if (stage === Stage.provision) {
            const checkRes = await this.checkWhetherSolutionIsIdle();
            if (checkRes.isErr()) return err(checkRes.error);

            const res = this.getSelectedPlugins(ctx);
            if (res.isErr()) {
                return err(res.error);
            }
            for (const plugin of res.value) {
                if (plugin.getQuestions) {
                    const pluginCtx = getPluginContext(ctx, plugin.name, this.manifest);
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
            const options: OptionItem[] = pluginsToDeploy.map((plugin) => {
                const item: OptionItem = { id: plugin.name, label: plugin.displayName };
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
                const pluginCtx = getPluginContext(ctx, plugin.name, this.manifest);
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
        const maybeSelectedPlugins = this.getSelectedPlugins(ctx);

        if (maybeSelectedPlugins.isErr()) {
            return maybeSelectedPlugins;
        }

        const selectedPlugins = maybeSelectedPlugins.value;

        // Just to trigger M365 login before the concurrent execution of localDebug. 
        // Because concurrent exectution of localDebug may getAccessToken() concurrently, which
        // causes 2 M365 logins before the token caching in common lib takes effect.
        await ctx.appStudioToken?.getAccessToken();

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
        if (selectedPlugins.some((plugin) => plugin.name === this.aadPlugin.name)) {
            const aadPlugin: AadAppForTeamsPlugin = this.aadPlugin as any;
            const result = aadPlugin.setApplicationInContext(getPluginContext(ctx, this.aadPlugin.name, this.manifest), true);
            if (result.isErr()) {
                return result;
            }
        }

        const maybeConfig = this.getLocalDebugConfig(ctx.config);

        if (maybeConfig.isErr()) {
            return maybeConfig;
        }

        const {localTabEndpoint, localTabDomain, localAADId, localBotDomain, bots, composeExtensions, webApplicationInfoResource} = maybeConfig.value;

        const validDomains: string[] = [];

        if (localTabDomain) {
            validDomains.push(localTabDomain);
        }

        if (localBotDomain) {
            validDomains.push(localBotDomain);
        }

        const manifestTpl = (await fs.readFile(`${ctx.root}/.${ConfigFolderName}/manifest.remote.json`)).toString();
        const [appDefinition, _updatedManifest] = AppStudio.getDevAppDefinition(
            manifestTpl,
            localAADId,
            validDomains,
            webApplicationInfoResource,
            localTabEndpoint,
            this.manifest!.name.short,
            this.manifest!.version,
            bots,
            composeExtensions
        );

        const localTeamsAppID = ctx.config.get(GLOBAL_CONFIG)?.getString(LOCAL_DEBUG_TEAMS_APP_ID);
        // If localTeamsAppID is present, we should reuse the teams app id.
        if (localTeamsAppID) {
            const result = await this.updateApp(
                localTeamsAppID, 
                appDefinition, 
                "localDebug", 
                ctx.logProvider, 
                await ctx.appStudioToken?.getAccessToken()
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
            );
            if (maybeTeamsAppId.isErr()) {
                return maybeTeamsAppId;
            }
            ctx.config.get(GLOBAL_CONFIG)?.set(LOCAL_DEBUG_TEAMS_APP_ID, maybeTeamsAppId.value);
        }

        const result = this.loadTeamsAppTenantId(ctx.config, await ctx.appStudioToken?.getJsonObject());

        if (result.isErr()) {
            return result;
        }
        
        return executeConcurrently(postLocalDebugWithCtx);
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

    private getLocalDebugConfig(config: SolutionConfig): Result<{localTabEndpoint?: string, localTabDomain?:string, localAADId: string, localBotDomain?: string, bots?: string, composeExtensions?: string, webApplicationInfoResource: string}, SystemError> {
        const localTabEndpoint = config.get(this.localDebugPlugin.name)?.getString(LOCAL_DEBUG_TAB_ENDPOINT);
        const localTabDomain = config.get(this.localDebugPlugin.name)?.getString(LOCAL_DEBUG_TAB_DOMAIN);
        const localAADId = config.get(this.aadPlugin.name)?.getString(LOCAL_DEBUG_AAD_ID);
        const localBotDomain = config.get(this.localDebugPlugin.name)?.getString(LOCAL_DEBUG_BOT_DOMAIN);
        const bots = config.get(this.botPlugin.name)?.getString(BOTS);
        const composeExtensions = config.get(this.botPlugin.name)?.getString(COMPOSE_EXTENSIONS);
        // This config value is set by aadPlugin.setApplicationInContext. so aadPlugin.setApplicationInContext needs to run first.
        const webApplicationInfoResource = config.get(this.aadPlugin.name)?.getString(LOCAL_WEB_APPLICATION_INFO_SOURCE);
        if (!webApplicationInfoResource) {
            return err(returnSystemError(new Error("Failed to get webApplicationInfoResource"), "Solution", SolutionError.GetLocalDebugConfigError));
        }

        if (!localAADId) {
            return err(
                returnSystemError(
                    new Error(`config ${LOCAL_DEBUG_AAD_ID} is missing`),
                    "Solution",
                    SolutionError.GetLocalDebugConfigError,
                ),
            );
        }
        // localTabEndpoint, bots and composeExtensions can't all be undefined
        if (!localTabEndpoint && !bots && !composeExtensions) {
            return err(
                returnSystemError(
                    new Error(`${LOCAL_DEBUG_TAB_ENDPOINT}, ${BOTS}, ${COMPOSE_EXTENSIONS} are all missing`),
                    "Solution",
                    SolutionError.GetLocalDebugConfigError,
                ),
            );
        }
        if ((localTabEndpoint && !localTabDomain) || (!localTabEndpoint && localTabDomain)) {
            return err(
                returnSystemError(
                    new Error(`Invalid config for tab: ${LOCAL_DEBUG_TAB_ENDPOINT}=${localTabEndpoint} ${LOCAL_DEBUG_TAB_DOMAIN}=${localTabDomain}`),
                    "Solution",
                    SolutionError.GetLocalDebugConfigError,
                ),
            );
        }
        if (bots || composeExtensions) {
            if (!localBotDomain) {
                return err(
                    returnSystemError(
                        new Error(`${LOCAL_DEBUG_BOT_DOMAIN} is undefined`),
                        "Solution",
                        SolutionError.GetLocalDebugConfigError
                    )
                );
            }
        }
        
        return ok({localTabEndpoint, localTabDomain, localAADId, localBotDomain, bots, composeExtensions, webApplicationInfoResource});
    }

    async callFunc(func: Func, ctx: SolutionContext): Promise<Result<any, FxError>> {
        const namespace = func.namespace;
        const array = namespace.split("/");
        if (array.length === 2) {
            const pluginName = array[1];
            const plugin = this.pluginMap.get(pluginName);
            if (plugin && plugin.callFunc) {
                const pctx = getPluginContext(ctx, plugin.name, this.manifest);
                if (func.method === "aadUpdatePermission") {
                    const result = await this.updatePermissionRequest(ctx);
                    if (result.isErr()) {
                        return result;
                    }
                }
                return await plugin.callFunc(func, pctx);
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

    async getQuestionsForAddResource(ctx: SolutionContext): Promise<Result<QTreeNode | undefined, FxError>>{
       
        const settings = this.getAzureSolutionSettings(ctx);

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

        const haveAzureFrontend = selectedPlugins.some(i=> (i === this.fehostPlugin.name));

        if(!haveAzureFrontend){
            return err(
                returnUserError(
                    new Error("Add resource is only supported for Tab app hosted in Azure."),
                    "Solution",
                    SolutionError.AddResourceNotSupport,
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
            const pluginCtx = getPluginContext(ctx, this.functionPlugin.name, this.manifest);
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
            const pluginCtx = getPluginContext(ctx, this.sqlPlugin.name, this.manifest);
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
            const pluginCtx = getPluginContext(ctx, this.apimPlugin.name, this.manifest);
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

    async getQuestionsForAddCapability(ctx: SolutionContext): Promise<Result<QTreeNode | undefined, FxError>> {
        
        const settings = this.getAzureSolutionSettings(ctx);

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
        const alreadyHaveTab = selectedPlugins.some(i=>i === this.fehostPlugin.name || i === this.spfxPlugin.name);

        const alreadyHaveBot = selectedPlugins.includes( this.botPlugin.name );

        if(alreadyHaveBot && alreadyHaveTab){
            return ok(undefined);
        }
        
        const addCapQuestion = createAddCapabilityQuestion(alreadyHaveTab, alreadyHaveBot);

        const addCapNode = new QTreeNode(addCapQuestion);

        //Tab sub tree
        if(!alreadyHaveTab){
            const tabRes = await this.getTabScaffoldQuestions(ctx);
            if (tabRes.isErr()) return tabRes;
            if (tabRes.value) {
                const tabNode = tabRes.value;
                tabNode.condition = { contains: TabOptionItem.id };
                addCapNode.addChild(tabNode);
            }
        }

        //Bot sub tree
        if(!alreadyHaveBot && this.botPlugin.getQuestions){
            const pluginCtx = getPluginContext(ctx, this.botPlugin.name, this.manifest);
            const res = await this.botPlugin.getQuestions(Stage.create, pluginCtx);
            if (res.isErr()) return res;
            if (res.value) {
                const child = res.value as QTreeNode;
                child.condition = { contains: BotOptionItem.id };
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
        if(func.method === "addCapability"){
            return await this.getQuestionsForAddCapability(ctx);
        }
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

        const capabilitiesAnswer = ctx.answers.getStringArray(AzureSolutionQuestionNames.Capabilities);

        if(!capabilitiesAnswer || capabilitiesAnswer.length === 0){
            return ok(Void);
        }

        const settings = this.getAzureSolutionSettings(ctx);
 
        const addCapabilityNotification:string[]  = [];

        if(capabilitiesAnswer?.includes(TabOptionItem.id)){
            const hostType = ctx.answers?.getString(AzureSolutionQuestionNames.HostType);
            settings.hostType = hostType;
            if(hostType === HostTypeOptionAzure.id){
                ctx.logProvider?.info(`start scaffolding Azure Tab Frontend .....`);
                const scaffoldRes = await this.scaffoldOne(this.fehostPlugin, ctx);
                if (scaffoldRes.isErr()) {
                    ctx.logProvider?.info(`failed to scaffold Azure Tab Frontend!`);
                    return err(scaffoldRes.error);
                }
                ctx.logProvider?.info(`finish scaffolding Azure Tab Frontend!`);
                addCapabilityNotification.push("Azure Tab Frontend");
            }
            else if(hostType === HostTypeOptionSPFx.id){
                ctx.logProvider?.info(`start scaffolding SPFx Tab Frontend.....`);
                const scaffoldRes = await this.scaffoldOne(this.spfxPlugin, ctx);
                if (scaffoldRes.isErr()) {
                    ctx.logProvider?.info(`failed to scaffold SPFx Tab Frontend!`);
                    return err(scaffoldRes.error);
                }
                ctx.logProvider?.info(`finish scaffolding SPFx Tab Frontend!`);
                addCapabilityNotification.push("SPFx Tab Frontend");
            }
        }

        if(capabilitiesAnswer?.includes(BotOptionItem.id)){
            ctx.logProvider?.info(`start scaffolding Bot.....`);
            const scaffoldRes = await this.scaffoldOne(this.botPlugin, ctx);
            if (scaffoldRes.isErr()) {
                ctx.logProvider?.info(`failed to scaffold Bot!`);
                return err(scaffoldRes.error);
            }
            ctx.logProvider?.info(`finish scaffolding Bot!`);
            addCapabilityNotification.push("Bot");
        }

        if(addCapabilityNotification.length > 0){
            // finally add capabilities array and reload plugins
            let reload = false;
            for(const cap of capabilitiesAnswer!){
                if(!settings.capabilities?.includes(cap)){
                    settings.capabilities?.push(cap);
                    reload = true;
                }
            }
            if(reload){
                this.reloadPlugins(ctx);
                ctx.logProvider?.info(`start scaffolding Local Debug Configs.....`);
                const scaffoldRes = await this.scaffoldOne(this.localDebugPlugin, ctx);
                if (scaffoldRes.isErr()) {
                    ctx.logProvider?.info(`failed to scaffold Debug Configs!`);
                    return err(scaffoldRes.error);
                }
                ctx.logProvider?.info(`finish scaffolding Local Debug Configs!`);
                ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false); //if selected plugin changed, we need to re-do provision
            }

            ctx.dialog?.communicate(
                new DialogMsg(DialogType.Show, {
                    description: `[Teams Toolkit] Capability "${addCapabilityNotification.join(
                        ",",
                    )}" have been successfully configured for your project, trigger 'TeamsFx - Provision Resource' will create the resource(s) in your Azure subscription.`,
                    level: MsgLevel.Info,
                }),
            );
        }

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
        if (namespace.includes("solution") && method === "registerTeamsAppAndAad") {
            const maybeParams = this.extractParamForRegisterTeamsAppAndAad(ctx.answers);
            if (maybeParams.isErr()) {
                return maybeParams;
            }
            return this.registerTeamsAppAndAad(ctx, maybeParams.value);
        } else if (array.length == 2) {
            const pluginName = array[1];
            const plugin = this.pluginMap.get(pluginName);
            if (plugin && plugin.executeUserTask) {
                const pctx = getPluginContext(ctx, plugin.name, this.manifest);
                if (func.method === "aadUpdatePermission") {
                    const result = await this.updatePermissionRequest(ctx);
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
     * In order to reuse aad plugin, we need to pretend we are still in vsc context.
     *
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
        const appDefinition = AppStudio.convertToAppDefinition(manifest);
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
        return ok({
            teamsAppId: teamsAppId,
            clientId: configResult.value.aadId,
            clientSecret: configResult.value.clientSecret,
            tenantId: maybeTenantId.value,
            applicationIdUri: configResult.value.applicationIdUri
        });

    }
}
