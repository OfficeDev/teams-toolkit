// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import { AzureSolutionSettings, Func, FxError, NodeType, PluginContext, QTreeNode, ReadonlyPluginConfig, Result, Stage } from "fx-api";
import { StorageManagementClient } from "@azure/arm-storage";
import { StringDictionary } from "@azure/arm-appservice/esm/models";
import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";
import { v4 as uuid } from "uuid";

import { AzureClientFactory, AzureLib } from "./utils/azure-client";
import {
    ConfigFunctionAppError,
    GetConnectionStringError,
    InitAzureSDKError,
    InstallNpmPackageError,
    InstallTeamsfxBindingError,
    NoFunctionNameFromAnswer,
    NotProvisionError,
    NotScaffoldError,
    ProvisionError,
    ValidationError,
    runWithErrorCatchAndThrow
} from "./resources/errors";
import {
    DefaultProvisionConfigs, DefaultValues, DependentPluginInfo,
    FunctionPluginInfo,
    FunctionPluginPathInfo,
    QuestionValidationFunc,
    RegularExpr
} from "./constants";
import { DialogUtils } from "./utils/dialog";
import { ErrorMessages, InfoMessages } from "./resources/message";
import { FunctionConfigKey, FunctionLanguage, NodeVersion, QuestionKey, ResourceType } from "./enums";
import { FunctionDeploy } from "./ops/deploy";
import { FunctionNaming, FunctionProvision } from "./ops/provision";
import { FunctionScaffold } from "./ops/scaffold";
import { FxResult, FunctionPluginResultFactory as ResultFactory } from "./result";
import { Logger } from "./utils/logger";
import { PostProvisionSteps, PreDeploySteps, ProvisionSteps, StepGroup, step } from "./resources/steps";
import { functionNameQuestion, nodeVersionQuestion } from "./questions";

type Site = WebSiteManagementModels.Site;
type AppServicePlan = WebSiteManagementModels.AppServicePlan;
type SiteAuthSettings = WebSiteManagementModels.SiteAuthSettings;

export interface FunctionConfig {
    /* Config from solution */
    resourceGroupName?: string;
    subscriptionId?: string;
    resourceNameSuffix?: string;
    location?: string;
    functionName?: string;

    /* Config exported by Function plugin */
    functionLanguage?: FunctionLanguage;
    functionAppName?: string;
    defaultFunctionName?: string;
    storageAccountName?: string;
    appServicePlanName?: string;
    functionEndpoint?: string;

    /* States */
    scaffoldDone: boolean;
    provisionDone: boolean;

    /* Intermediate  */
    nodeVersion?: NodeVersion;
    skipDeploy: boolean;
}

export class FunctionPluginImpl {
    config: FunctionConfig = {
        scaffoldDone: false,
        provisionDone: false,
        skipDeploy: false
    };

    private syncConfigFromContext(ctx: PluginContext): void {
        const solutionConfig: ReadonlyPluginConfig | undefined
            = ctx.configOfOtherPlugins.get(DependentPluginInfo.solutionPluginName);

        this.config.resourceNameSuffix = solutionConfig?.get(DependentPluginInfo.resourceNameSuffix) as string;
        this.config.resourceGroupName = solutionConfig?.get(DependentPluginInfo.resourceGroupName) as string;
        this.config.subscriptionId = solutionConfig?.get(DependentPluginInfo.subscriptionId) as string;
        this.config.location = solutionConfig?.get(DependentPluginInfo.location) as string;
        this.config.functionLanguage = ctx.answers?.get(QuestionKey.programmingLanguage) as FunctionLanguage;
        this.config.nodeVersion = ctx.config.get(FunctionConfigKey.nodeVersion) as NodeVersion;
        this.config.defaultFunctionName = ctx.config.get(FunctionConfigKey.defaultFunctionName) as string;
        this.config.functionAppName = ctx.config.get(FunctionConfigKey.functionAppName) as string;
        this.config.storageAccountName = ctx.config.get(FunctionConfigKey.storageAccountName) as string;
        this.config.appServicePlanName = ctx.config.get(FunctionConfigKey.appServicePlanName) as string;
        this.config.scaffoldDone = ctx.config.get(FunctionConfigKey.scaffoldDone) === true.toString();
        this.config.provisionDone = ctx.config.get(FunctionConfigKey.provisionDone) === true.toString();

        /* Always validate after sync for safety and security. */
        this.validateConfig();
    }

    private syncConfigToContext(ctx: PluginContext): void {
        Object.entries(this.config)
            .filter(kv => FunctionPluginInfo.FunctionPluginPersistentConfig.find((x: FunctionConfigKey) => x === kv[0]))
            .forEach(kv => {
                if (kv[1]) {
                    ctx.config.set(kv[0], kv[1].toString());
                }
            });
    }

    private validateConfig(): void {
        if (this.config.functionLanguage &&
            !Object.values(FunctionLanguage).includes(this.config.functionLanguage)) {
                throw new ValidationError(FunctionConfigKey.functionLanguage);
        }

        if (this.config.nodeVersion &&
            !Object.values(NodeVersion).includes(this.config.nodeVersion)) {
                throw new ValidationError(FunctionConfigKey.nodeVersion);
        }

        if (this.config.resourceNameSuffix &&
            !RegularExpr.validResourceSuffixPattern.test(this.config.resourceNameSuffix)) {
                throw new ValidationError(FunctionConfigKey.resourceNameSuffix);
        }

        if (this.config.functionAppName &&
            !RegularExpr.validFunctionAppNamePattern.test(this.config.functionAppName)) {
                throw new ValidationError(FunctionConfigKey.functionAppName);
        }

        if (this.config.storageAccountName &&
            !RegularExpr.validStorageAccountNamePattern.test(this.config.storageAccountName)) {
                throw new ValidationError(FunctionConfigKey.storageAccountName);
        }

        if (this.config.appServicePlanName &&
            !RegularExpr.validAppServicePlanNamePattern.test(this.config.appServicePlanName)) {
                throw new ValidationError(FunctionConfigKey.appServicePlanName);
        }

        if (this.config.defaultFunctionName &&
            !RegularExpr.validFunctionNamePattern.test(this.config.defaultFunctionName)) {
                throw new ValidationError(FunctionConfigKey.defaultFunctionName);
        }
    }

    public async callFunc(func: Func, ctx: PluginContext): Promise<FxResult> {
        if (func.method === QuestionValidationFunc.validateFunctionName) {
            const workingPath: string = this.getFunctionProjectRootPath(ctx);
            const name = func.params as string;
            if (!name || !RegularExpr.validFunctionNamePattern.test(name)) {
                return ResultFactory.Success(ErrorMessages.invalidFunctionName);
            }

            const stage: Stage | undefined = ctx.answers?.get(QuestionKey.stage) as Stage;
            if (stage === Stage.create) {
                return ResultFactory.Success();
            }

            const language: FunctionLanguage =
                ctx.answers?.get(QuestionKey.programmingLanguage) as FunctionLanguage;

            // If language is unknown, skip checking and let scaffold handle the error.
            if (language && await FunctionScaffold.doesFunctionPathExist(workingPath, language, name)) {
                return ResultFactory.Success(ErrorMessages.functionAlreadyExists);
            }
        }

        return ResultFactory.Success();
    }

    public getQuestions(stage: Stage, ctx: PluginContext): Result<QTreeNode | undefined, FxError> {
        const res = new QTreeNode({
            type: NodeType.group
        });

        if (stage === Stage.create || (stage === Stage.update && !ctx.config.get(FunctionConfigKey.nodeVersion))) {
            res.addChild(nodeVersionQuestion);
        }

        if (stage === Stage.create || stage === Stage.update) {
            res.addChild(functionNameQuestion);
        }

        return ResultFactory.Success(res);
    }

    public async preScaffold(ctx: PluginContext): Promise<FxResult> {
        this.syncConfigFromContext(ctx);

        if (!this.config.nodeVersion) {
            this.config.nodeVersion = ctx.answers?.get(QuestionKey.nodeVersion) as NodeVersion;
        }

        // Always ask name in case user wants to add more functions.
        const name: string | undefined = ctx.answers?.get(QuestionKey.functionName) as string;
        if (!name) {
            Logger.error("Fail to fetch function name from question");
            throw new NoFunctionNameFromAnswer();
        }
        this.config.functionName = name;

        this.syncConfigToContext(ctx);

        return ResultFactory.Success();
    }

    public async scaffold(ctx: PluginContext): Promise<FxResult> {
        const workingPath: string = this.getFunctionProjectRootPath(ctx);

        const functionName: string = this.checkAndGet(this.config.functionName, FunctionConfigKey.functionName);
        const functionLanguage: FunctionLanguage = this.checkAndGet(this.config.functionLanguage, FunctionConfigKey.functionLanguage);

        await FunctionScaffold.scaffoldFunction(
            workingPath, functionLanguage, DefaultValues.functionTriggerType, functionName,
            {
                appName: ctx.app.name.short,
                functionName: functionName
            });

        if (!this.config.defaultFunctionName) {
            this.config.defaultFunctionName = this.config.functionName;
        }

        this.config.scaffoldDone = true;
        this.syncConfigToContext(ctx);

        return ResultFactory.Success();
    }

    public async preProvision(ctx: PluginContext): Promise<FxResult> {
        this.syncConfigFromContext(ctx);

        if (!this.config.scaffoldDone) {
            throw new NotScaffoldError();
        }

        if (!this.config.functionAppName || !this.config.storageAccountName || !this.config.appServicePlanName) {
            const teamsAppName: string = ctx.app.name.short;
            const suffix: string = this.config.resourceNameSuffix ?? uuid().substr(0, 6);

            if (!this.config.functionAppName) {
                this.config.functionAppName =
                    FunctionNaming.generateFunctionAppName(teamsAppName, DefaultProvisionConfigs.nameSuffix, suffix);
                Logger.info(InfoMessages.generateFunctionAppName(this.config.functionAppName));
            }

            if (!this.config.storageAccountName) {
                this.config.storageAccountName =
                    FunctionNaming.generateStorageAccountName(teamsAppName, DefaultProvisionConfigs.nameSuffix, suffix);
                Logger.info(InfoMessages.generateStorageAccountName(this.config.storageAccountName));
            }

            if (!this.config.appServicePlanName) {
                this.config.appServicePlanName = this.config.functionAppName;
                Logger.info(InfoMessages.generateAppServicePlanName(this.config.appServicePlanName));
            }
        }

        this.syncConfigToContext(ctx);
        return ResultFactory.Success();
    }

    public async provision(ctx: PluginContext): Promise<FxResult> {
        const resourceGroupName = this.checkAndGet(this.config.resourceGroupName, FunctionConfigKey.resourceGroupName);
        const subscriptionId = this.checkAndGet(this.config.subscriptionId, FunctionConfigKey.subscriptionId);
        const location = this.checkAndGet(this.config.location, FunctionConfigKey.location);
        const appServicePlanName = this.checkAndGet(this.config.appServicePlanName, FunctionConfigKey.appServicePlanName);
        const storageAccountName = this.checkAndGet(this.config.storageAccountName, FunctionConfigKey.storageAccountName);
        const functionAppName = this.checkAndGet(this.config.functionAppName, FunctionConfigKey.functionAppName);
        const functionLanguage = this.checkAndGet(this.config.functionLanguage, FunctionConfigKey.functionLanguage);
        const nodeVersion = this.checkAndGet(this.config.nodeVersion, FunctionConfigKey.nodeVersion);
        const credential = this.checkAndGet(await ctx.azureAccountProvider?.getAccountCredentialAsync(), FunctionConfigKey.credential);

        const storageManagementClient: StorageManagementClient =
            await runWithErrorCatchAndThrow(new InitAzureSDKError(),
                () => AzureClientFactory.getStorageManagementClient(credential, subscriptionId)
            );

        Logger.info(InfoMessages.checkResource(ResourceType.storageAccount, storageAccountName, resourceGroupName));

        await runWithErrorCatchAndThrow(new ProvisionError(ResourceType.storageAccount),
            () => step(StepGroup.ProvisionStepGroup, ProvisionSteps.ensureStorageAccount, async () =>
                await AzureLib.ensureStorageAccount(
                    storageManagementClient,
                    resourceGroupName,
                    storageAccountName,
                    DefaultProvisionConfigs.storageConfig(location))
            )
        );

        const storageConnectionString: string | undefined =
            await runWithErrorCatchAndThrow(new GetConnectionStringError(), async () =>
                await step(StepGroup.ProvisionStepGroup, ProvisionSteps.getConnectionString, async () =>
                    AzureLib.getConnectionString(storageManagementClient, resourceGroupName, storageAccountName)
                )
            );

        if (!storageConnectionString) {
            Logger.error(ErrorMessages.failToGetConnectionString);
            throw new GetConnectionStringError();
        }

        const webSiteManagementClient: WebSiteManagementClient =
            await runWithErrorCatchAndThrow(new InitAzureSDKError(),
                () => AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId)
            );

        Logger.info(InfoMessages.checkResource(ResourceType.appServicePlan, appServicePlanName, resourceGroupName));

        const appServicePlan: AppServicePlan =
            await runWithErrorCatchAndThrow(new ProvisionError(ResourceType.appServicePlan), async () =>
                await step(StepGroup.ProvisionStepGroup, ProvisionSteps.ensureAppServicePlans, async () =>
                    AzureLib.ensureAppServicePlans(
                        webSiteManagementClient,
                        resourceGroupName,
                        appServicePlanName,
                        DefaultProvisionConfigs.appServicePlansConfig(location)
                    )
                )
            );

        const appServicePlanId: string | undefined = appServicePlan.id;
        if (!appServicePlanId) {
            Logger.error(ErrorMessages.failToGetAppServicePlanId);
            throw new ProvisionError(ResourceType.appServicePlan);
        }

        Logger.info(InfoMessages.checkResource(ResourceType.functionApp, appServicePlanName, resourceGroupName));

        const site: Site =
            await runWithErrorCatchAndThrow(new ProvisionError(ResourceType.functionApp), async () =>
                await step(StepGroup.ProvisionStepGroup, ProvisionSteps.ensureFunctionApp, async () =>
                    FunctionProvision.ensureFunctionApp(
                        webSiteManagementClient,
                        resourceGroupName,
                        location,
                        functionAppName,
                        functionLanguage,
                        appServicePlanId,
                        storageConnectionString,
                        nodeVersion)
                )
            );

        if (!site.defaultHostName) {
            Logger.error(ErrorMessages.failToGetFunctionAppEndpoint);
            throw new ProvisionError(ResourceType.functionApp);
        }

        if (!this.config.functionEndpoint) {
            this.config.functionEndpoint = `https://${site.defaultHostName}`;
        }

        this.syncConfigToContext(ctx);
        return ResultFactory.Success();
    }

    public async postProvision(ctx: PluginContext): Promise<FxResult> {
        const subscriptionId = this.checkAndGet(this.config.subscriptionId, FunctionConfigKey.subscriptionId);
        const functionAppName = this.checkAndGet(this.config.functionAppName, FunctionConfigKey.functionAppName);
        const resourceGroupName = this.checkAndGet(this.config.resourceGroupName, FunctionConfigKey.resourceGroupName);
        const credential = this.checkAndGet(await ctx.azureAccountProvider?.getAccountCredentialAsync(), FunctionConfigKey.credential);

        const webSiteManagementClient: WebSiteManagementClient =
            await runWithErrorCatchAndThrow(new InitAzureSDKError(), () =>
                AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId)
            );

        const site: Site | undefined =
            await runWithErrorCatchAndThrow(new ConfigFunctionAppError(), async () =>
                await step(StepGroup.PostProvisionStepGroup, PostProvisionSteps.findFunctionApp, async () =>
                    AzureLib.findFunctionApp(webSiteManagementClient, resourceGroupName, functionAppName)
                ));
        if (!site) {
            Logger.error(ErrorMessages.failToFindFunctionApp);
            throw new ConfigFunctionAppError();
        }

        if (!site.siteConfig) {
            Logger.info(InfoMessages.functionAppConfigIsEmpty);
            site.siteConfig = {};
        }

        // The site queried does not contains appSettings, complete it through another API.
        if (!site.siteConfig.appSettings) {
            const res: StringDictionary =
                await runWithErrorCatchAndThrow(new ConfigFunctionAppError(), async () =>
                    await webSiteManagementClient.webApps.listApplicationSettings(resourceGroupName, functionAppName)
                );

            if (res.properties) {
                site.siteConfig.appSettings = Object.entries(res.properties).map((kv: [string, string]) => ({
                    name: kv[0],
                    value: kv[1]
                }));
            }
        }

        this.collectFunctionAppSettings(ctx, site);

        await runWithErrorCatchAndThrow(new ConfigFunctionAppError(), async () =>
            await step(StepGroup.PostProvisionStepGroup, PostProvisionSteps.updateFunctionSettings, async () =>
                await webSiteManagementClient.webApps.update(resourceGroupName, functionAppName, site)
            )
        );
        Logger.info(InfoMessages.functionAppSettingsUpdated);

        const authSettings: SiteAuthSettings | undefined = this.collectFunctionAppAuthSettings(ctx);
        if (authSettings) {
            await runWithErrorCatchAndThrow(new ConfigFunctionAppError(), async () =>
                await step(StepGroup.PostProvisionStepGroup, PostProvisionSteps.updateFunctionSettings, async () =>
                    await webSiteManagementClient.webApps.updateAuthSettings(resourceGroupName, functionAppName, authSettings)
                )
            );
        }
        Logger.info(InfoMessages.functionAppAuthSettingsUpdated);

        this.config.provisionDone = true;
        this.syncConfigToContext(ctx);

        return ResultFactory.Success();
    }

    public async preDeploy(ctx: PluginContext): Promise<FxResult> {
        this.syncConfigFromContext(ctx);

        if (!this.config.scaffoldDone) {
            throw new NotScaffoldError();
        }

        if (!this.config.provisionDone) {
            throw new NotProvisionError();
        }

        const workingPath: string = this.getFunctionProjectRootPath(ctx);
        const functionLanguage: FunctionLanguage = this.checkAndGet(this.config.functionLanguage, FunctionConfigKey.functionLanguage);

        const updated: boolean = await FunctionDeploy.hasUpdatedContent(workingPath, functionLanguage);
        if (!updated) {
            Logger.info(InfoMessages.skipDeployment);
            DialogUtils.show(ctx, InfoMessages.skipDeployment);
            this.config.skipDeploy = true;
            return ResultFactory.Success();
        }

        await FunctionDeploy.checkDotNetVersion(ctx, workingPath);

        await runWithErrorCatchAndThrow(new InstallTeamsfxBindingError(), async () =>
            await step(StepGroup.PreDeployStepGroup, PreDeploySteps.installTeamsfxBinding, async () =>
                FunctionDeploy.installFuncExtensions(workingPath, functionLanguage)
            )
        );

        await runWithErrorCatchAndThrow(new InstallNpmPackageError(), async () =>
            await step(StepGroup.PreDeployStepGroup, PreDeploySteps.npmPrepare, async () =>
                FunctionDeploy.build(workingPath, functionLanguage)
            )
        );

        this.config.skipDeploy = false;

        return ResultFactory.Success();
    }

    public async deploy(ctx: PluginContext): Promise<FxResult> {
        if (this.config.skipDeploy) {
            return ResultFactory.Success();
        }

        const workingPath: string = this.getFunctionProjectRootPath(ctx);
        const subscriptionId: string = this.checkAndGet(this.config.subscriptionId, FunctionConfigKey.subscriptionId);
        const functionAppName: string = this.checkAndGet(this.config.functionAppName, FunctionConfigKey.functionAppName);
        const resourceGroupName: string = this.checkAndGet(this.config.resourceGroupName, FunctionConfigKey.resourceGroupName);
        const functionLanguage: FunctionLanguage = this.checkAndGet(this.config.functionLanguage, FunctionConfigKey.functionLanguage);
        const credential = this.checkAndGet(await ctx.azureAccountProvider?.getAccountCredentialAsync(), FunctionConfigKey.credential);

        const webSiteManagementClient: WebSiteManagementClient =
            await runWithErrorCatchAndThrow(new InitAzureSDKError(), () =>
                AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId)
            );

        await FunctionDeploy.deployFunction(
            webSiteManagementClient, workingPath, functionAppName, functionLanguage, resourceGroupName);

        return ResultFactory.Success();
    }

    private getFunctionProjectRootPath(ctx: PluginContext): string {
        return path.join(ctx.root, FunctionPluginPathInfo.solutionFolderName);
    }

    private checkAndGet<T>(v: T | undefined, key: string): T {
        if (v) {
            return v;
        }
        throw new ValidationError(key);
    }

    public isPluginEnabled(ctx: PluginContext, plugin: string): boolean {
        const solutionConfig: ReadonlyPluginConfig | undefined =
            ctx.configOfOtherPlugins.get(DependentPluginInfo.solutionPluginName);
        // const selectedPlugins: string[] = solutionConfig?.get(DependentPluginInfo.selectedPlugins) as string[] ?? [];
        const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings).activeResourcePlugins;
        return selectedPlugins.includes(plugin);
    }

    private collectFunctionAppSettings(ctx: PluginContext, site: Site): void {
        const functionEndpoint: string = this.checkAndGet(this.config.functionEndpoint, FunctionConfigKey.functionEndpoint);
        FunctionProvision.updateFunctionSettingsSelf(site, functionEndpoint);

        const aadConfig: ReadonlyPluginConfig | undefined = ctx.configOfOtherPlugins.get(DependentPluginInfo.aadPluginName);
        if (this.isPluginEnabled(ctx, DependentPluginInfo.aadPluginName) && aadConfig) {
            Logger.info(InfoMessages.dependPluginDetected(DependentPluginInfo.aadPluginName));

            const clientId: string =
                this.checkAndGet(aadConfig.get(DependentPluginInfo.aadClientId) as string, "AAD client Id");
            const clientSecret: string =
                this.checkAndGet(aadConfig.get(DependentPluginInfo.aadClientSecret) as string, "AAD secret");
            const oauthHost: string =
                this.checkAndGet(aadConfig.get(DependentPluginInfo.oauthHost) as string, "OAuth Host");
            const tenantId: string =
                this.checkAndGet(aadConfig.get(DependentPluginInfo.tenantId) as string, "Tenant Id");
            const applicationIdUris: string =
                this.checkAndGet(aadConfig.get(DependentPluginInfo.applicationIdUris) as string, "Application Id URI");

            FunctionProvision.updateFunctionSettingsForAAD(site, clientId, clientSecret, oauthHost, tenantId, applicationIdUris);
        }

        const frontendConfig: ReadonlyPluginConfig | undefined = ctx.configOfOtherPlugins.get(DependentPluginInfo.frontendPluginName);
        if (this.isPluginEnabled(ctx, DependentPluginInfo.frontendPluginName) && frontendConfig) {
            Logger.info(InfoMessages.dependPluginDetected(DependentPluginInfo.frontendPluginName));

            const frontendEndpoint: string =
                this.checkAndGet(frontendConfig.get(DependentPluginInfo.frontendEndpoint) as string, "frontend endpoint");

            FunctionProvision.updateFunctionSettingsForFrontend(site, frontendEndpoint);
        }

        const sqlConfig: ReadonlyPluginConfig | undefined = ctx.configOfOtherPlugins.get(DependentPluginInfo.sqlPluginName);
        const identityConfig: ReadonlyPluginConfig | undefined = ctx.configOfOtherPlugins.get(DependentPluginInfo.identityPluginName);
        if (this.isPluginEnabled(ctx, DependentPluginInfo.sqlPluginName) &&
            this.isPluginEnabled(ctx, DependentPluginInfo.identityPluginName) &&
            sqlConfig && identityConfig) {

            Logger.info(InfoMessages.dependPluginDetected(DependentPluginInfo.sqlPluginName));
            Logger.info(InfoMessages.dependPluginDetected(DependentPluginInfo.identityPluginName));

            const identityId: string =
                this.checkAndGet(identityConfig.get(DependentPluginInfo.identityId) as string, "identity Id");
            const databaseName: string =
                this.checkAndGet(sqlConfig.get(DependentPluginInfo.databaseName) as string, "database name");
            const sqlEndpoint: string =
                this.checkAndGet(sqlConfig.get(DependentPluginInfo.sqlEndpoint) as string, "sql endpoint");
            const identityName: string =
                this.checkAndGet(identityConfig.get(DependentPluginInfo.identityName) as string, "identity name");

            FunctionProvision.updateFunctionSettingsForSQL(site, identityId, databaseName, sqlEndpoint, identityName);
        }

        const apimConfig: ReadonlyPluginConfig | undefined = ctx.configOfOtherPlugins.get(DependentPluginInfo.apimPluginName);
        if (this.isPluginEnabled(ctx, DependentPluginInfo.apimPluginName) && apimConfig) {
            Logger.info(InfoMessages.dependPluginDetected(DependentPluginInfo.apimPluginName));

            const clientId: string =
                this.checkAndGet(apimConfig.get(DependentPluginInfo.apimAppId) as string, "APIM app Id");

            FunctionProvision.ensureFunctionAllowAppIds(site, [clientId]);
        }
    }

    private collectFunctionAppAuthSettings(ctx: PluginContext): SiteAuthSettings | undefined {
        const aadConfig: ReadonlyPluginConfig | undefined = ctx.configOfOtherPlugins.get(DependentPluginInfo.aadPluginName);
        const frontendConfig: ReadonlyPluginConfig | undefined = ctx.configOfOtherPlugins.get(DependentPluginInfo.frontendPluginName);

        if (this.isPluginEnabled(ctx, DependentPluginInfo.aadPluginName) &&
            this.isPluginEnabled(ctx, DependentPluginInfo.frontendPluginName) &&
            aadConfig && frontendConfig) {

            const clientId: string =
                this.checkAndGet(aadConfig.get(DependentPluginInfo.aadClientId) as string, "AAD client Id");
            const oauthHost: string =
                this.checkAndGet(aadConfig.get(DependentPluginInfo.oauthHost) as string, "OAuth Host");
            const tenantId: string =
                this.checkAndGet(aadConfig.get(DependentPluginInfo.tenantId) as string, "tenant Id");
            const frontendEndpoint: string =
                this.checkAndGet(frontendConfig.get(DependentPluginInfo.frontendEndpoint) as string, "frontend endpoint");
            const frontendDomain: string =
                this.checkAndGet(frontendConfig.get(DependentPluginInfo.frontendDomain) as string, "frontend domain");

            return FunctionProvision.constructFunctionAuthSettings(clientId, frontendDomain, frontendEndpoint, oauthHost, tenantId);
        }

        return undefined;
    }
}
