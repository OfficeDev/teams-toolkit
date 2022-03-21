// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import {
  AzureSolutionSettings,
  Func,
  FxError,
  Inputs,
  PluginContext,
  QTreeNode,
  ReadonlyPluginConfig,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";
import { StringDictionary } from "@azure/arm-appservice/esm/models";
import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";

import { AzureClientFactory, AzureLib } from "./utils/azure-client";
import {
  ConfigFunctionAppError,
  FetchConfigError,
  FindAppError,
  FunctionNameConflictError,
  InitAzureSDKError,
  InstallNpmPackageError,
  InstallTeamsFxBindingError,
  runWithErrorCatchAndThrow,
  ValidationError,
} from "./resources/errors";
import {
  DefaultValues,
  DependentPluginInfo,
  FunctionBicep,
  FunctionBicepFile,
  FunctionPluginInfo,
  FunctionPluginPathInfo,
  QuestionValidationFunc,
  RegularExpr,
} from "./constants";
import { ErrorMessages, InfoMessages } from "./resources/message";
import {
  CustomizedTask,
  FunctionConfigKey,
  FunctionEvent,
  FunctionLanguage,
  NodeVersion,
  QuestionKey,
} from "./enums";
import { FunctionDeploy } from "./ops/deploy";
import { FunctionProvision } from "./ops/provision";
import { FunctionScaffold } from "./ops/scaffold";
import { FunctionPluginResultFactory as ResultFactory, FxResult } from "./result";
import { Logger } from "./utils/logger";
import { PostProvisionSteps, PreDeploySteps, step, StepGroup } from "./resources/steps";
import { funcDepsHelper } from "./utils/depsChecker/funcHelper";
import { LinuxNotSupportedError } from "../../../common/deps-checker/depsError";
import { CheckerFactory } from "../../../common/deps-checker/checkerFactory";
import { DepsChecker, DepsType } from "../../../common/deps-checker/depsChecker";
import { funcDepsTelemetry } from "./utils/depsChecker/funcPluginTelemetry";
import { funcDepsLogger } from "./utils/depsChecker/funcPluginLogger";
import { TelemetryHelper } from "./utils/telemetry-helper";
import { getTemplatesFolder } from "../../../folder";
import { ArmTemplateResult } from "../../../common/armInterface";
import { Bicep } from "../../../common/constants";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../common";
import { functionNameQuestion } from "./question";
import { getActivatedV2ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../solution/fx-solution/v2/adaptor";
import { generateBicepFromFile } from "../../../common/tools";
import { getNodeVersion } from "./utils/node-version";

type Site = WebSiteManagementModels.Site;
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
  functionAppResourceId?: string;

  /* Intermediate  */
  skipDeploy: boolean;
  site?: Site;
}

export class FunctionPluginImpl {
  config: FunctionConfig = {
    skipDeploy: false,
  };

  private async syncConfigFromContext(ctx: PluginContext): Promise<void> {
    this.config.functionLanguage = ctx.projectSettings?.programmingLanguage as FunctionLanguage;
    this.config.defaultFunctionName = ctx.projectSettings?.defaultFunctionName as string;

    this.config.functionEndpoint = ctx.config.get(FunctionConfigKey.functionEndpoint) as string;
    this.config.functionAppResourceId = ctx.config.get(
      FunctionConfigKey.functionAppResourceId
    ) as string;

    /* Always validate after sync for safety and security. */
    this.validateConfig();
  }

  private syncConfigToContext(ctx: PluginContext): void {
    // sync plugin config to context
    Object.entries(this.config)
      .filter((kv) =>
        FunctionPluginInfo.FunctionPluginPersistentConfig.find(
          (x: FunctionConfigKey) => x === kv[0]
        )
      )
      .forEach((kv) => {
        if (kv[1]) {
          ctx.config.set(kv[0], kv[1].toString());
        }
      });

    // sync project settings to context
    if (this.config.defaultFunctionName) {
      ctx.projectSettings!.defaultFunctionName = this.config.defaultFunctionName;
    }
  }

  private validateConfig(): void {
    if (
      this.config.functionLanguage &&
      !Object.values(FunctionLanguage).includes(this.config.functionLanguage)
    ) {
      throw new ValidationError(FunctionConfigKey.functionLanguage);
    }

    if (
      this.config.resourceNameSuffix &&
      !RegularExpr.validResourceSuffixPattern.test(this.config.resourceNameSuffix)
    ) {
      throw new ValidationError(FunctionConfigKey.resourceNameSuffix);
    }

    if (
      this.config.functionAppName &&
      !RegularExpr.validFunctionAppNamePattern.test(this.config.functionAppName)
    ) {
      throw new ValidationError(FunctionConfigKey.functionAppName);
    }

    if (
      this.config.storageAccountName &&
      !RegularExpr.validStorageAccountNamePattern.test(this.config.storageAccountName)
    ) {
      throw new ValidationError(FunctionConfigKey.storageAccountName);
    }

    if (
      this.config.appServicePlanName &&
      !RegularExpr.validAppServicePlanNamePattern.test(this.config.appServicePlanName)
    ) {
      throw new ValidationError(FunctionConfigKey.appServicePlanName);
    }

    if (
      this.config.defaultFunctionName &&
      !RegularExpr.validFunctionNamePattern.test(this.config.defaultFunctionName)
    ) {
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

      const stage: Stage | undefined = ctx.answers![QuestionKey.stage] as Stage;
      if (stage === Stage.create) {
        return ResultFactory.Success();
      }

      const language: FunctionLanguage =
        (ctx.answers![QuestionKey.programmingLanguage] as FunctionLanguage) ??
        (ctx.projectSettings?.programmingLanguage as FunctionLanguage);

      // If language is unknown, skip checking and let scaffold handle the error.
      if (language && (await FunctionScaffold.doesFunctionPathExist(workingPath, language, name))) {
        return ResultFactory.Success(ErrorMessages.functionAlreadyExists);
      }
    }

    return ResultFactory.Success();
  }

  public getQuestionsForUserTask(
    func: Func,
    ctx: PluginContext
  ): Result<QTreeNode | undefined, FxError> {
    const res = new QTreeNode({
      type: "group",
    });

    if (func.method === CustomizedTask.addResource) {
      functionNameQuestion.validation = {
        validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
          const workingPath: string = this.getFunctionProjectRootPath(ctx);
          const name = input as string;
          if (!name || !RegularExpr.validFunctionNamePattern.test(name)) {
            return ErrorMessages.invalidFunctionName;
          }

          const stage: Stage | undefined = ctx.answers![QuestionKey.stage] as Stage;
          if (stage === Stage.create) {
            return undefined;
          }

          const language: FunctionLanguage =
            (ctx.answers![QuestionKey.programmingLanguage] as FunctionLanguage) ??
            (ctx.projectSettings?.programmingLanguage as FunctionLanguage);

          // If language is unknown, skip checking and let scaffold handle the error.
          if (
            language &&
            (await FunctionScaffold.doesFunctionPathExist(workingPath, language, name))
          ) {
            return ErrorMessages.functionAlreadyExists;
          }
        },
      };
      res.addChild(new QTreeNode(functionNameQuestion));
    }

    return ResultFactory.Success(res);
  }

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<FxResult> {
    let result = ResultFactory.Success();

    if (func.method === CustomizedTask.addResource) {
      TelemetryHelper.sendGeneralEvent(FunctionEvent.addResource);
      result = result.isErr() ? result : await this.preScaffold(ctx);
      result = result.isErr() ? result : await this.scaffold(ctx);
    }

    return result;
  }

  public async preScaffold(ctx: PluginContext): Promise<FxResult> {
    await this.syncConfigFromContext(ctx);

    const workingPath: string = this.getFunctionProjectRootPath(ctx);
    const functionLanguage: FunctionLanguage = this.checkAndGet(
      this.config.functionLanguage,
      FunctionConfigKey.functionLanguage
    );

    const name: string =
      (ctx.answers![QuestionKey.functionName] as string) ?? DefaultValues.functionName;
    if (await FunctionScaffold.doesFunctionPathExist(workingPath, functionLanguage, name)) {
      throw new FunctionNameConflictError();
    }

    this.config.functionName = name;
    this.syncConfigToContext(ctx);

    return ResultFactory.Success();
  }

  public async scaffold(ctx: PluginContext): Promise<FxResult> {
    const workingPath: string = this.getFunctionProjectRootPath(ctx);

    const functionName: string = this.checkAndGet(
      this.config.functionName,
      FunctionConfigKey.functionName
    );
    const functionLanguage: FunctionLanguage = this.checkAndGet(
      this.config.functionLanguage,
      FunctionConfigKey.functionLanguage
    );

    await FunctionScaffold.scaffoldFunction(
      workingPath,
      functionLanguage,
      DefaultValues.functionTriggerType,
      functionName,
      {
        appName: ctx.projectSettings!.appName,
        functionName: functionName,
      }
    );

    if (!this.config.defaultFunctionName) {
      this.config.defaultFunctionName = this.config.functionName;
    }

    this.syncConfigToContext(ctx);

    return ResultFactory.Success();
  }

  private async getValidNodeVersion(ctx: PluginContext): Promise<NodeVersion> {
    const currentNodeVersion = await getNodeVersion(this.getFunctionProjectRootPath(ctx));
    const candidateNodeVersions = Object.values(NodeVersion);
    return (
      candidateNodeVersions.find((v: NodeVersion) => v === currentNodeVersion) ??
      DefaultValues.nodeVersion
    );
  }

  public async postProvision(ctx: PluginContext): Promise<FxResult> {
    await this.syncConfigFromContext(ctx);

    const functionAppName = this.getFunctionAppName();
    const resourceGroupName = this.getFunctionAppResourceGroupName();
    const subscriptionId = this.getFunctionAppSubscriptionId();
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getAccountCredentialAsync(),
      FunctionConfigKey.credential
    );

    const webSiteManagementClient: WebSiteManagementClient = await runWithErrorCatchAndThrow(
      new InitAzureSDKError(),
      () => AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId)
    );

    const site = await this.getSite(
      ctx,
      webSiteManagementClient,
      resourceGroupName,
      functionAppName
    );

    // We must query app settings from azure here, for two reasons:
    // 1. The site object returned by SDK may not contain app settings.
    // 2. Azure automatically added some app settings during creation.
    const res: StringDictionary = await runWithErrorCatchAndThrow(
      new ConfigFunctionAppError(),
      async () =>
        await webSiteManagementClient.webApps.listApplicationSettings(
          resourceGroupName,
          functionAppName
        )
    );

    if (res.properties) {
      Object.entries(res.properties).forEach((kv: [string, string]) => {
        // The site have some settings added in provision step,
        // which should not be overwritten by queried settings.
        FunctionProvision.pushAppSettings(site, kv[0], kv[1], false);
      });
    }

    this.collectFunctionAppSettings(ctx, site);

    await runWithErrorCatchAndThrow(
      new ConfigFunctionAppError(),
      async () =>
        await step(
          StepGroup.PostProvisionStepGroup,
          PostProvisionSteps.updateFunctionSettings,
          async () =>
            await webSiteManagementClient.webApps.update(resourceGroupName, functionAppName, site)
        )
    );
    Logger.info(InfoMessages.functionAppSettingsUpdated);

    this.syncConfigToContext(ctx);

    return ResultFactory.Success();
  }

  public async preDeploy(ctx: PluginContext): Promise<FxResult> {
    await this.syncConfigFromContext(ctx);

    const workingPath: string = this.getFunctionProjectRootPath(ctx);
    const functionLanguage: FunctionLanguage = this.checkAndGet(
      this.config.functionLanguage,
      FunctionConfigKey.functionLanguage
    );

    const updated: boolean = await FunctionDeploy.hasUpdatedContent(
      workingPath,
      functionLanguage,
      ctx.envInfo.envName
    );
    if (!updated) {
      Logger.info(InfoMessages.noChange);
      this.config.skipDeploy = true;
      return ResultFactory.Success();
    }

    // NOTE: make sure this step is before using `dotnet` command if you refactor this code.
    await this.handleDotnetChecker(ctx);

    await this.handleBackendExtensionsInstall(ctx, workingPath, functionLanguage);

    await runWithErrorCatchAndThrow(
      new InstallNpmPackageError(),
      async () =>
        await step(StepGroup.PreDeployStepGroup, PreDeploySteps.npmPrepare, async () =>
          FunctionDeploy.build(workingPath, functionLanguage)
        )
    );

    this.config.skipDeploy = false;

    return ResultFactory.Success();
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<FxResult> {
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "function",
      "bicep"
    );
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const configFuncTemplateFilePath = path.join(
      bicepTemplateDirectory,
      FunctionBicepFile.configuraitonTemplateFileName
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const configModule = await generateBicepFromFile(configFuncTemplateFilePath, pluginCtx);

    const result: ArmTemplateResult = {
      Reference: {
        functionAppResourceId: FunctionBicep.functionAppResourceId,
        functionEndpoint: FunctionBicep.functionEndpoint,
      },
      Configuration: {
        Modules: { function: configModule },
      },
    };

    return ResultFactory.Success(result);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<FxResult> {
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "function",
      "bicep"
    );
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );

    const provisionTemplateFilePath = path.join(bicepTemplateDirectory, Bicep.ProvisionFileName);

    const provisionFuncTemplateFilePath = path.join(
      bicepTemplateDirectory,
      FunctionBicepFile.provisionModuleTemplateFileName
    );

    const configTemplateFilePath = path.join(bicepTemplateDirectory, Bicep.ConfigFileName);

    const configFuncTemplateFilePath = path.join(
      bicepTemplateDirectory,
      FunctionBicepFile.configuraitonTemplateFileName
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const provisionOrchestration = await generateBicepFromFile(
      provisionTemplateFilePath,
      pluginCtx
    );
    const provisionModule = await generateBicepFromFile(provisionFuncTemplateFilePath, pluginCtx);
    const configOrchestration = await generateBicepFromFile(configTemplateFilePath, pluginCtx);
    const configModule = await generateBicepFromFile(configFuncTemplateFilePath, pluginCtx);
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { function: provisionModule },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { function: configModule },
      },
      Reference: {
        functionAppResourceId: FunctionBicep.functionAppResourceId,
        functionEndpoint: FunctionBicep.functionEndpoint,
      },
    };

    return ResultFactory.Success(result);
  }

  public async deploy(ctx: PluginContext): Promise<FxResult> {
    if (this.config.skipDeploy) {
      TelemetryHelper.sendGeneralEvent(FunctionEvent.skipDeploy);
      Logger.warning(InfoMessages.skipDeployment);
      return ResultFactory.Success();
    }

    const workingPath: string = this.getFunctionProjectRootPath(ctx);
    const functionAppName = this.getFunctionAppName();
    const resourceGroupName = this.getFunctionAppResourceGroupName();
    const subscriptionId = this.getFunctionAppSubscriptionId();
    const functionLanguage: FunctionLanguage = this.checkAndGet(
      this.config.functionLanguage,
      FunctionConfigKey.functionLanguage
    );
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getAccountCredentialAsync(),
      FunctionConfigKey.credential
    );

    const webSiteManagementClient: WebSiteManagementClient = await runWithErrorCatchAndThrow(
      new InitAzureSDKError(),
      () => AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId)
    );

    Logger.debug(
      `deploy function with subscription id: ${subscriptionId}, resourceGroup name: ${resourceGroupName}, function web app name: ${functionAppName}`
    );
    await FunctionDeploy.deployFunction(
      webSiteManagementClient,
      workingPath,
      functionAppName,
      functionLanguage,
      resourceGroupName,
      ctx.envInfo.envName
    );

    return ResultFactory.Success();
  }

  private getFunctionProjectRootPath(ctx: PluginContext): string {
    return path.join(ctx.root, FunctionPluginPathInfo.solutionFolderName);
  }

  private checkAndGet<T>(v: T | undefined, key: string): T {
    if (v) {
      return v;
    }
    throw new FetchConfigError(key);
  }

  public isPluginEnabled(ctx: PluginContext, plugin: string): boolean {
    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    return selectedPlugins.includes(plugin);
  }

  private getFunctionAppName(): string {
    return getSiteNameFromResourceId(
      this.checkAndGet(this.config.functionAppResourceId, FunctionConfigKey.functionAppResourceId)
    );
  }

  private getFunctionAppResourceGroupName(): string {
    return getResourceGroupNameFromResourceId(
      this.checkAndGet(this.config.functionAppResourceId, FunctionConfigKey.functionAppResourceId)
    );
  }

  private getFunctionAppSubscriptionId(): string {
    return getSubscriptionIdFromResourceId(
      this.checkAndGet(this.config.functionAppResourceId, FunctionConfigKey.functionAppResourceId)
    );
  }

  private async getSite(
    ctx: PluginContext,
    client: WebSiteManagementClient,
    resourceGroupName: string,
    functionAppName: string
  ): Promise<Site> {
    const site = await AzureLib.findFunctionApp(client, resourceGroupName, functionAppName);
    if (!site) {
      throw new FindAppError();
    } else {
      const nodeVersion = await this.getValidNodeVersion(ctx);
      FunctionProvision.pushAppSettings(site, "WEBSITE_NODE_DEFAULT_VERSION", "~" + nodeVersion);
      return site;
    }
  }

  private async updateAuthSetting(
    ctx: PluginContext,
    client: WebSiteManagementClient,
    resourceGroupName: string,
    functionAppName: string
  ): Promise<void> {
    const authSettings: SiteAuthSettings | undefined = this.collectFunctionAppAuthSettings(ctx);
    if (authSettings) {
      await runWithErrorCatchAndThrow(
        new ConfigFunctionAppError(),
        async () =>
          await step(
            StepGroup.PostProvisionStepGroup,
            PostProvisionSteps.updateFunctionSettings,
            async () =>
              await client.webApps.updateAuthSettings(
                resourceGroupName,
                functionAppName,
                authSettings
              )
          )
      );
    }
    Logger.info(InfoMessages.functionAppAuthSettingsUpdated);
  }

  private collectFunctionAppSettings(ctx: PluginContext, site: Site): void {
    const functionEndpoint: string = this.checkAndGet(
      this.config.functionEndpoint,
      FunctionConfigKey.functionEndpoint
    );

    const apimConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.apimPluginName
    );
    if (this.isPluginEnabled(ctx, DependentPluginInfo.apimPluginName) && apimConfig) {
      Logger.info(InfoMessages.dependPluginDetected(DependentPluginInfo.apimPluginName));

      const clientId: string = this.checkAndGet(
        apimConfig.get(DependentPluginInfo.apimAppId) as string,
        "APIM app Id"
      );

      FunctionProvision.ensureFunctionAllowAppIds(site, [clientId]);
    }
  }

  private collectFunctionAppAuthSettings(ctx: PluginContext): SiteAuthSettings | undefined {
    const aadConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.aadPluginName
    );
    const frontendConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.frontendPluginName
    );

    if (
      this.isPluginEnabled(ctx, DependentPluginInfo.aadPluginName) &&
      this.isPluginEnabled(ctx, DependentPluginInfo.frontendPluginName) &&
      aadConfig &&
      frontendConfig
    ) {
      const clientId: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.aadClientId) as string,
        "AAD client Id"
      );
      const oauthHost: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.oauthHost) as string,
        "OAuth Host"
      );
      const tenantId: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.tenantId) as string,
        "tenant Id"
      );
      const applicationIdUri: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.applicationIdUris) as string,
        "Application Id URI"
      );

      return FunctionProvision.constructFunctionAuthSettings(
        clientId,
        applicationIdUri,
        oauthHost,
        tenantId
      );
    }

    return undefined;
  }

  private async handleDotnetChecker(ctx: PluginContext): Promise<void> {
    const dotnetChecker: DepsChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      funcDepsLogger,
      funcDepsTelemetry
    );
    await step(StepGroup.PreDeployStepGroup, PreDeploySteps.dotnetInstall, async () => {
      try {
        if (!(await funcDepsHelper.dotnetCheckerEnabled(ctx.answers))) {
          return;
        }
        await dotnetChecker.resolve();
      } catch (error) {
        if (error instanceof LinuxNotSupportedError) {
          return;
        }
        funcDepsLogger.error(InfoMessages.failedToInstallDotnet(error));
        await funcDepsLogger.printDetailLog();
        throw funcDepsHelper.transferError(error);
      } finally {
        funcDepsLogger.cleanup();
      }
    });
  }

  private async handleBackendExtensionsInstall(
    ctx: PluginContext,
    workingPath: string,
    functionLanguage: FunctionLanguage
  ): Promise<void> {
    await runWithErrorCatchAndThrow(
      new InstallTeamsFxBindingError(),
      async () =>
        await step(StepGroup.PreDeployStepGroup, PreDeploySteps.installTeamsfxBinding, async () => {
          try {
            await FunctionDeploy.installFuncExtensions(workingPath, functionLanguage);
          } catch (error) {
            // wrap the original error to UserError so the extensibility model will pop-up a dialog correctly
            throw funcDepsHelper.transferError(error);
          }
        })
    );
  }
}
