// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  err,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  Stage,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import {
  genTemplateRenderReplaceFn,
  removeTemplateExtReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../common/template-utils/templatesActions";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getStorageAccountNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../../common/tools";
import { getTemplatesFolder } from "../../../../folder";
import { TabOptionItem } from "../../../solution/fx-solution/question";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { AzureStorageClient } from "../clients";
import { FrontendConfig } from "../configs";
import {
  Constants,
  DefaultValues,
  DependentPluginInfo,
  FrontendOutputBicepSnippet,
  FrontendPathInfo,
  FunctionPluginPathInfo,
  RegularExpr,
} from "../constants";
import { FunctionConfigKey, FunctionLanguage, QuestionKey } from "../enums";
import { envFilePath, EnvKeys, loadEnvFile, saveEnvFile } from "../env";
import { FrontendDeployment } from "../ops/deploy";
import { FunctionScaffold } from "../ops/scaffold";
import { FunctionConfig } from "../plugin";
import { functionNameQuestion } from "../question";
import {
  TemplateZipFallbackError,
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../resources/errors";
import { ErrorMessages } from "../resources/message";
import { Messages } from "../resources/messages";
import { DeployProgress, PostProvisionProgress, ScaffoldProgress } from "../resources/steps";
import { Scenario, TemplateInfo } from "../resources/templateInfo";
import {
  EnableStaticWebsiteError,
  FetchConfigError,
  FunctionNameConflictError,
  UnauthenticatedError,
  ValidationError,
} from "./error";

@Service(BuiltInFeaturePluginNames.function)
export class FunctionPluginV3 implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.frontend;
  displayName = "Azure Function";
  config: FunctionConfig = {
    skipDeploy: false,
  };
  private getFunctionProjectRootPath(projectPath: string): string {
    return path.join(projectPath, FunctionPluginPathInfo.solutionFolderName);
  }

  async getQuestionsForAddFeature(
    ctx: v2.Context,
    inputs: Inputs,
    envInfo?: v2.DeepReadonly<v3.EnvInfoV3Question>
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
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
  ): Promise<void> {
    this.config.functionLanguage = ctx.projectSetting.programmingLanguage as FunctionLanguage;
    this.config.defaultFunctionName = ctx.projectSetting.defaultFunctionName as string;
    this.config.functionEndpoint = (envInfo?.state[this.name] as v3.AzureFunction).functionEndpoint;
    this.config.functionAppResourceId = (
      envInfo?.state[this.name] as v3.AzureFunction
    ).functionAppResourceId;

    /* Always validate after sync for safety and security. */
    this.validateConfig();
  }

  private syncConfigToContext(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
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
  private checkAndGet<T>(v: T | undefined, key: string): T {
    if (v) {
      return v;
    }
    throw new FetchConfigError(key);
  }
  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<Void | undefined, FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    await this.syncConfigFromContext(ctx, inputs, envInfo);

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
    return ok(undefined);
  }
  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    ctx.logProvider.info(Messages.StartGenerateArmTemplates(this.name));
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    const pluginCtx = { plugins: solutionSettings ? solutionSettings.activeResourcePlugins : [] };

    return ok({ kind: "bicep", template: result });
  }
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
    const scaffoldRes = await this.scaffold(ctx, inputs);
    if (scaffoldRes.isErr()) return err(scaffoldRes.error);
    const armRes = await this.generateResourceTemplate(ctx, inputs);
    if (armRes.isErr()) return err(armRes.error);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const capabilities = solutionSettings.capabilities;
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!capabilities.includes(TabOptionItem.id)) capabilities.push(TabOptionItem.id);
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok(armRes.value);
  }
  async afterOtherFeaturesAdded(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.OtherFeaturesAddedInputs,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
    ctx.logProvider.info(Messages.StartUpdateArmTemplates(this.name));
    const result: ArmTemplateResult = {
      Reference: {
        endpoint: FrontendOutputBicepSnippet.Endpoint,
        domain: FrontendOutputBicepSnippet.Domain,
      },
    };
    return ok({ kind: "bicep", template: result });
  }

  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }
}
