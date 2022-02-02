// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  err,
  FxError,
  ok,
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
  DependentPluginInfo,
  FrontendOutputBicepSnippet,
  FrontendPathInfo,
} from "../constants";
import { envFilePath, EnvKeys, loadEnvFile, saveEnvFile } from "../env";
import { FrontendDeployment } from "../ops/deploy";
import {
  TemplateZipFallbackError,
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../resources/errors";
import { Messages } from "../resources/messages";
import { DeployProgress, PostProvisionProgress, ScaffoldProgress } from "../resources/steps";
import { Scenario, TemplateInfo } from "../resources/templateInfo";
import { EnableStaticWebsiteError, UnauthenticatedError } from "./error";

@Service(BuiltInFeaturePluginNames.frontend)
export class NodeJSTabFrontendPlugin implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.frontend;
  displayName = "NodeJS Tab frontend";
  description = "Tab frontend with React Framework using Javascript/Typescript";
  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void | undefined, FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    ctx.logProvider.info(Messages.StartScaffold(this.name));
    const progress = ctx.userInteraction.createProgressBar(
      Messages.ScaffoldProgressTitle,
      Object.entries(ScaffoldProgress.steps).length
    );
    await progress.start(Messages.ProgressStart);
    await progress.next(ScaffoldProgress.steps.Scaffold);
    const template = inputs.template;
    const language = template === "ReactTab_TS" ? "ts" : "js";
    const componentPath = path.join(inputs.projectPath, FrontendPathInfo.WorkingDir);
    const hasFunction = solutionSettings
      ? solutionSettings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.function)
      : false;
    const variables = {
      showFunction: hasFunction.toString(),
    };
    await scaffoldFromTemplates({
      group: TemplateInfo.TemplateGroupName,
      lang: language,
      scenario: Scenario.Default,
      templatesFolderName: FrontendPathInfo.TemplateFolderName,
      dst: componentPath,
      fileNameReplaceFn: removeTemplateExtReplaceFn,
      fileDataReplaceFn: genTemplateRenderReplaceFn(variables),
      onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
        if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
          ctx.logProvider.info(Messages.getTemplateFrom(context.zipUrl ?? Constants.EmptyString));
        }
      },
      onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
        ctx.logProvider.info(error.toString());
        switch (action.name) {
          case ScaffoldActionName.FetchTemplatesUrlWithTag:
          case ScaffoldActionName.FetchTemplatesZipFromUrl:
            // TelemetryHelper.sendScaffoldFallbackEvent(new TemplateManifestError(error.message));//TODO
            ctx.logProvider.info(Messages.FailedFetchTemplate);
            break;
          case ScaffoldActionName.FetchTemplateZipFromLocal:
            throw new TemplateZipFallbackError();
          case ScaffoldActionName.Unzip:
            throw new UnzipTemplateError();
          default:
            throw new UnknownScaffoldError();
        }
      },
    });
    await progress.end(true);
    ctx.logProvider.info(Messages.EndScaffold(this.name));
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
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      FrontendPathInfo.BicepTemplateRelativeDir
    );
    const provisionFilePath = path.join(bicepTemplateDir, Bicep.ProvisionFileName);
    const moduleProvisionFilePath = path.join(
      bicepTemplateDir,
      FrontendPathInfo.ModuleProvisionFileName
    );
    const provisionOrchestration = await generateBicepFromFile(provisionFilePath, pluginCtx);
    const provisionModules = await generateBicepFromFile(moduleProvisionFilePath, pluginCtx);

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { frontendHosting: provisionModules },
      },
      Reference: {
        endpoint: FrontendOutputBicepSnippet.Endpoint,
        domain: FrontendOutputBicepSnippet.Domain,
      },
    };
    return ok({ kind: "bicep", template: result });
  }
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
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
    inputs: v3.OtherFeaturesAddedInputs
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
  private async buildFrontendConfig(
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<FrontendConfig, FxError>> {
    const credentials = await tokenProvider.getAccountCredentialAsync();
    if (!credentials) {
      return err(new UnauthenticatedError());
    }
    const storage = envInfo.state[this.name] as v3.FrontendHostingResource;
    const frontendConfig = new FrontendConfig(
      getSubscriptionIdFromResourceId(storage.storageResourceId),
      getResourceGroupNameFromResourceId(storage.storageResourceId),
      (envInfo.state.solution as v3.AzureSolutionConfig).location,
      getStorageAccountNameFromResourceId(storage.storageResourceId),
      credentials
    );
    return ok(frontendConfig);
  }
  private async updateDotEnv(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3
  ): Promise<Result<Void, FxError>> {
    const envs = this.collectEnvs(ctx, inputs, envInfo);
    await saveEnvFile(
      envFilePath(envInfo.envName, path.join(inputs.projectPath, FrontendPathInfo.WorkingDir)),
      {
        teamsfxRemoteEnvs: envs,
        customizedRemoteEnvs: {},
      }
    );
    return ok(Void);
  }
  private collectEnvs(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3
  ): { [key: string]: string } {
    const envs: { [key: string]: string } = {};
    const addToEnvs = (key: string, value: string | undefined) => {
      // Check for both null and undefined, add to envs when value is "", 0 or false.
      if (value != null) {
        envs[key] = value;
      }
    };
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    if (solutionSettings) {
      if (solutionSettings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.function)) {
        const functionState = envInfo.state[BuiltInFeaturePluginNames.function] as v3.AzureFunction;
        addToEnvs(EnvKeys.FuncName, ctx.projectSetting.defaultFunctionName);
        addToEnvs(EnvKeys.FuncEndpoint, functionState.functionEndpoint);
      }

      if (solutionSettings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.simpleAuth)) {
        const simpleAuthState = envInfo.state[
          BuiltInFeaturePluginNames.simpleAuth
        ] as v3.SimpleAuth;
        addToEnvs(EnvKeys.RuntimeEndpoint, simpleAuthState.endpoint);
        addToEnvs(EnvKeys.StartLoginPage, DependentPluginInfo.StartLoginPageURL);
      }

      if (solutionSettings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.aad)) {
        const aadState = envInfo.state[BuiltInFeaturePluginNames.aad] as v3.AADApp;
        addToEnvs(EnvKeys.ClientID, aadState.clientId);
      }
    }
    return envs;
  }
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(Messages.StartPostProvision(this.name));
    const progress = ctx.userInteraction.createProgressBar(
      Messages.PostProvisionProgressTitle,
      Object.entries(PostProvisionProgress.steps).length
    );
    await progress.start(Messages.ProgressStart);
    await progress.next(PostProvisionProgress.steps.EnableStaticWebsite);
    const frontendConfigRes = await this.buildFrontendConfig(
      envInfo,
      tokenProvider.azureAccountProvider
    );
    if (frontendConfigRes.isErr()) {
      return err(frontendConfigRes.error);
    }
    const client = new AzureStorageClient(frontendConfigRes.value);
    try {
      await client.enableStaticWebsite();
    } catch (e) {
      return err(new EnableStaticWebsiteError());
    }
    await this.updateDotEnv(ctx, inputs, envInfo);
    await progress.end(true);
    ctx.logProvider.info(Messages.EndPostProvision(this.name));
    return ok(Void);
  }
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(Messages.StartDeploy(this.name));
    const progress = ctx.userInteraction.createProgressBar(
      Messages.DeployProgressTitle,
      Object.entries(DeployProgress.steps).length
    );
    await progress.start(Messages.ProgressStart);
    const frontendConfigRes = await this.buildFrontendConfig(envInfo, tokenProvider);
    if (frontendConfigRes.isErr()) {
      return err(frontendConfigRes.error);
    }
    const client = new AzureStorageClient(frontendConfigRes.value);
    const componentPath: string = inputs.dir
      ? inputs.dir
      : path.join(inputs.projectPath, FrontendPathInfo.WorkingDir);
    const envName = envInfo.envName;

    const envs = await loadEnvFile(envFilePath(envName, componentPath));

    await FrontendDeployment.doFrontendBuildV3(componentPath, envs, envName, progress);
    await FrontendDeployment.doFrontendDeploymentV3(client, componentPath, envName);

    await progress.end(true);
    ctx.logProvider.info(Messages.EndDeploy(this.name));
    return ok(Void);
  }
}
