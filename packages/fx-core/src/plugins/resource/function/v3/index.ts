// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WebSiteManagementClient } from "@azure/arm-appservice";
import { Site, StringDictionary } from "@azure/arm-appservice/esm/models";
import { hooks } from "@feathersjs/hooks/lib";
import {
  AzureAccountProvider,
  AzureSolutionSettings,
  err,
  FxError,
  Inputs,
  ok,
  ProjectSettings,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import { CheckerFactory } from "../../../../common/deps-checker/checkerFactory";
import { DepsChecker, DepsType } from "../../../../common/deps-checker/depsChecker";
import { LinuxNotSupportedError } from "../../../../common/deps-checker/depsError";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../../common/tools";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { getTemplatesFolder } from "../../../../folder";
import { AzureResourceFunction } from "../../../solution/fx-solution/question";
import { ensureSolutionSettings } from "../../../solution/fx-solution/utils/solutionSettingsHelper";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import {
  DefaultValues,
  DependentPluginInfo,
  FunctionBicep,
  FunctionBicepFile,
  FunctionPluginInfo,
  FunctionPluginPathInfo,
  RegularExpr,
} from "../constants";
import {
  FunctionConfigKey,
  FunctionEvent,
  FunctionLanguage,
  NodeVersion,
  QuestionKey,
} from "../enums";
import { FunctionDeploy } from "../ops/deploy";
import { FunctionProvision } from "../ops/provision";
import { FunctionScaffold } from "../ops/scaffold";
import { FunctionConfig } from "../plugin";
import { functionNameQuestion } from "../question";
import { runWithErrorCatchAndThrow } from "../resources/errors";
import { ErrorMessages, InfoMessages } from "../resources/message";
import {
  DeploySteps,
  PostProvisionSteps,
  PreDeploySteps,
  step,
  StepGroup,
  StepHelperFactory,
} from "../resources/steps";
import { AzureClientFactory, AzureLib } from "../utils/azure-client";
import { funcDepsHelper } from "../utils/depsChecker/funcHelper";
import { funcDepsLogger } from "../utils/depsChecker/funcPluginLogger";
import { funcDepsTelemetry } from "../utils/depsChecker/funcPluginTelemetry";
import { getNodeVersion } from "../utils/node-version";
import { TelemetryHelper } from "../utils/telemetry-helper";
import {
  ConfigFunctionAppError,
  FetchConfigError,
  FindAppError,
  FunctionNameConflictError,
  InitAzureSDKError,
  InstallNpmPackageError,
  InstallTeamsFxBindingError,
  ValidationError,
} from "./error";

@Service(BuiltInFeaturePluginNames.function)
export class FunctionPluginV3 implements v3.PluginV3 {
  name = BuiltInFeaturePluginNames.function;
  displayName = "Azure Function";
  config: FunctionConfig = {
    skipDeploy: false,
  };
  private getFunctionProjectRootPath(projectPath: string): string {
    return path.join(projectPath, FunctionPluginPathInfo.solutionFolderName);
  }

  async getQuestionsForAddInstance(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const projectPath = inputs.projectPath;
    functionNameQuestion.validation = {
      validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
        if (!projectPath) return undefined;
        const workingPath: string = this.getFunctionProjectRootPath(projectPath);
        const name = input as string;
        if (!name || !RegularExpr.validFunctionNamePattern.test(name)) {
          return ErrorMessages.invalidFunctionName;
        }
        const language: FunctionLanguage =
          (inputs[QuestionKey.programmingLanguage] as FunctionLanguage) ??
          (ctx.projectSetting.programmingLanguage as FunctionLanguage);
        // If language is unknown, skip checking and let scaffold handle the error.
        if (
          language &&
          (await FunctionScaffold.doesFunctionPathExist(workingPath, language, name))
        ) {
          return ErrorMessages.functionAlreadyExists;
        }
      },
    };
    return ok(new QTreeNode(functionNameQuestion));
  }
  private async syncConfigFromContext(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
  ): Promise<void> {
    this.config.functionLanguage = ctx.projectSetting.programmingLanguage as FunctionLanguage;
    this.config.defaultFunctionName = ctx.projectSetting.defaultFunctionName as string;
    this.config.functionEndpoint = (
      envInfo?.state[this.name] as v3.AzureFunction
    )?.functionEndpoint;
    this.config.functionAppResourceId = (
      envInfo?.state[this.name] as v3.AzureFunction
    )?.functionAppResourceId;

    /* Always validate after sync for safety and security. */
    this.validateConfig();
  }

  private syncConfigToContext(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3
  ): void {
    // sync plugin config to context
    Object.entries(this.config)
      .filter((kv) =>
        FunctionPluginInfo.FunctionPluginPersistentConfig.find(
          (x: FunctionConfigKey) => x === kv[0]
        )
      )
      .forEach((kv) => {
        if (kv[1]) {
          envInfo.state[this.name][kv[0]] = kv[1].toString();
        }
      });

    // sync project settings to context
    if (this.config.defaultFunctionName) {
      ctx.projectSetting.defaultFunctionName = this.config.defaultFunctionName;
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
  private checkAndGet<T>(v: T | undefined, key: string): T {
    if (v) {
      return v;
    }
    throw new FetchConfigError(key);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.function } })])
  async generateCode(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.AddFeatureInputs
  ): Promise<Result<Void, FxError>> {
    await this.syncConfigFromContext(ctx, inputs);
    const workingPath: string = this.getFunctionProjectRootPath(inputs.projectPath);
    const functionLanguage: FunctionLanguage = this.checkAndGet(
      this.config.functionLanguage,
      FunctionConfigKey.functionLanguage
    );

    const name: string = (inputs[QuestionKey.functionName] as string) ?? DefaultValues.functionName;
    if (await FunctionScaffold.doesFunctionPathExist(workingPath, functionLanguage, name)) {
      throw new FunctionNameConflictError();
    }

    this.config.functionName = name;

    const functionName: string = this.checkAndGet(
      this.config.functionName,
      FunctionConfigKey.functionName
    );

    await FunctionScaffold.scaffoldFunction(
      workingPath,
      functionLanguage,
      DefaultValues.functionTriggerType,
      functionName,
      {
        appName: ctx.projectSetting.appName,
        functionName: functionName,
      }
    );

    if (!this.config.defaultFunctionName) {
      this.config.defaultFunctionName = this.config.functionName;
    }

    return ok(Void);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.function } })])
  async generateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.AddFeatureInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    if (solutionSettings.activeResourcePlugins.includes(this.name)) return ok([]);
    const pluginCtx = { plugins: inputs.allPluginsAfterAdd };
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "function",
      "bicep"
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
    const provisionOrchestration = await generateBicepFromFile(
      provisionTemplateFilePath,
      pluginCtx
    );
    const provisionModule = await generateBicepFromFile(provisionFuncTemplateFilePath, pluginCtx);
    const configOrchestration = await generateBicepFromFile(configTemplateFilePath, pluginCtx);
    const configModule = await generateBicepFromFile(configFuncTemplateFilePath, pluginCtx);
    const result: v3.BicepTemplate = {
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
    return ok([result]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.function } })])
  async updateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.UpdateInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "function",
      "bicep"
    );
    const pluginCtx = { plugins: inputs.allPluginsAfterAdd };
    const configFuncTemplateFilePath = path.join(
      bicepTemplateDirectory,
      FunctionBicepFile.configuraitonTemplateFileName
    );
    const configModule = await generateBicepFromFile(configFuncTemplateFilePath, pluginCtx);

    const result: v3.BicepTemplate = {
      Reference: {
        functionAppResourceId: FunctionBicep.functionAppResourceId,
        functionEndpoint: FunctionBicep.functionEndpoint,
      },
      Configuration: {
        Modules: { function: configModule },
      },
    };
    return ok([result]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.function } })])
  async addInstance(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<string[], FxError>> {
    ensureSolutionSettings(ctx.projectSetting);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const azureResources = solutionSettings.azureResources;
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!azureResources.includes(AzureResourceFunction.id))
      azureResources.push(AzureResourceFunction.id);
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok([BuiltInFeaturePluginNames.identity]);
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
  private async getValidNodeVersion(projectPath: string): Promise<NodeVersion> {
    const currentNodeVersion = await getNodeVersion(this.getFunctionProjectRootPath(projectPath));
    const candidateNodeVersions = Object.values(NodeVersion);
    return (
      candidateNodeVersions.find((v: NodeVersion) => v === currentNodeVersion) ??
      DefaultValues.nodeVersion
    );
  }
  private async getSite(
    projectPath: string,
    client: WebSiteManagementClient,
    resourceGroupName: string,
    functionAppName: string
  ): Promise<Site> {
    const site = await AzureLib.findFunctionApp(client, resourceGroupName, functionAppName);
    if (!site) {
      throw new FindAppError();
    } else {
      const nodeVersion = await this.getValidNodeVersion(projectPath);
      FunctionProvision.pushAppSettings(site, "WEBSITE_NODE_DEFAULT_VERSION", "~" + nodeVersion);
      return site;
    }
  }
  private collectFunctionAppSettings(ctx: v2.Context, envInfo: v3.EnvInfoV3, site: Site): void {
    const functionEndpoint: string = this.checkAndGet(
      this.config.functionEndpoint,
      FunctionConfigKey.functionEndpoint
    );

    const apimConfig = envInfo.state[BuiltInFeaturePluginNames.apim] as v3.APIM;
    if (this.isPluginEnabled(ctx.projectSetting, BuiltInFeaturePluginNames.apim) && apimConfig) {
      ctx.logProvider.info(InfoMessages.dependPluginDetected(BuiltInFeaturePluginNames.apim));

      const clientId: string = this.checkAndGet(apimConfig.apimClientAADClientId, "APIM app Id");

      FunctionProvision.ensureFunctionAllowAppIds(site, [clientId]);
    }
  }
  public isPluginEnabled(projectSettings: ProjectSettings, plugin: string): boolean {
    const selectedPlugins = projectSettings.solutionSettings
      ? (projectSettings.solutionSettings as AzureSolutionSettings).activeResourcePlugins
      : [];
    return selectedPlugins.includes(plugin);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.function } })])
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    await StepHelperFactory.postProvisionStepHelper.start(
      Object.entries(PostProvisionSteps).length,
      ctx.userInteraction
    );
    await this.syncConfigFromContext(ctx, inputs, envInfo);

    const functionAppName = this.getFunctionAppName();
    const resourceGroupName = this.getFunctionAppResourceGroupName();
    const subscriptionId = this.getFunctionAppSubscriptionId();
    const credential = this.checkAndGet(
      await tokenProvider.azureAccountProvider.getAccountCredentialAsync(),
      FunctionConfigKey.credential
    );

    const webSiteManagementClient: WebSiteManagementClient = await runWithErrorCatchAndThrow(
      new InitAzureSDKError(),
      () => AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId)
    );

    const site = await this.getSite(
      inputs.projectPath,
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

    this.collectFunctionAppSettings(ctx, envInfo, site);

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
    ctx.logProvider.info(InfoMessages.functionAppSettingsUpdated);

    this.syncConfigToContext(ctx, inputs, envInfo);

    await StepHelperFactory.postProvisionStepHelper.end(true);
    return ok(Void);
  }
  private async handleDotnetChecker(inputs: Inputs): Promise<void> {
    const dotnetChecker: DepsChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      funcDepsLogger,
      funcDepsTelemetry
    );
    await step(StepGroup.PreDeployStepGroup, PreDeploySteps.dotnetInstall, async () => {
      try {
        if (!(await funcDepsHelper.dotnetCheckerEnabled(inputs))) {
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
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.function } })])
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    await StepHelperFactory.preDeployStepHelper.start(
      Object.entries(PreDeploySteps).length,
      ctx.userInteraction
    );
    //PreDeploy

    await this.syncConfigFromContext(ctx, inputs, envInfo as v3.EnvInfoV3);

    const workingPath: string = this.getFunctionProjectRootPath(inputs.projectPath);
    const functionLanguage: FunctionLanguage = this.checkAndGet(
      this.config.functionLanguage,
      FunctionConfigKey.functionLanguage
    );

    const updated: boolean = await FunctionDeploy.hasUpdatedContent(
      workingPath,
      functionLanguage,
      envInfo.envName
    );
    if (!updated) {
      ctx.logProvider.info(InfoMessages.noChange);
      this.config.skipDeploy = true;
    } else {
      // NOTE: make sure this step is before using `dotnet` command if you refactor this code.
      await this.handleDotnetChecker(inputs);

      await this.handleBackendExtensionsInstall(workingPath, functionLanguage);

      await runWithErrorCatchAndThrow(
        new InstallNpmPackageError(),
        async () =>
          await step(StepGroup.PreDeployStepGroup, PreDeploySteps.npmPrepare, async () =>
            FunctionDeploy.build(workingPath, functionLanguage)
          )
      );

      this.config.skipDeploy = false;
    }

    await StepHelperFactory.preDeployStepHelper.end(true);

    await StepHelperFactory.deployStepHelper.start(
      Object.entries(DeploySteps).length,
      ctx.userInteraction
    );
    if (this.config.skipDeploy) {
      TelemetryHelper.sendGeneralEvent(FunctionEvent.skipDeploy);
      ctx.logProvider.warning(InfoMessages.skipDeployment);
    } else {
      const workingPath: string = this.getFunctionProjectRootPath(inputs.projectPath);
      const functionAppName = this.getFunctionAppName();
      const resourceGroupName = this.getFunctionAppResourceGroupName();
      const subscriptionId = this.getFunctionAppSubscriptionId();
      const functionLanguage: FunctionLanguage = this.checkAndGet(
        this.config.functionLanguage,
        FunctionConfigKey.functionLanguage
      );
      const credential = this.checkAndGet(
        await tokenProvider.azureAccountProvider.getAccountCredentialAsync(),
        FunctionConfigKey.credential
      );

      const webSiteManagementClient: WebSiteManagementClient = await runWithErrorCatchAndThrow(
        new InitAzureSDKError(),
        () => AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId)
      );

      ctx.logProvider.debug(
        `deploy function with subscription id: ${subscriptionId}, resourceGroup name: ${resourceGroupName}, function web app name: ${functionAppName}`
      );
      await FunctionDeploy.deployFunction(
        webSiteManagementClient,
        workingPath,
        functionAppName,
        functionLanguage,
        resourceGroupName,
        envInfo.envName
      );
    }

    await StepHelperFactory.deployStepHelper.end(true);

    return ok(Void);
  }
}
