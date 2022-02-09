// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  AzureAccountProvider,
  AzureSolutionSettings,
  err,
  FxError,
  Inputs,
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
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { getTemplatesFolder } from "../../../../folder";
import { TabOptionItem } from "../../../solution/fx-solution/question";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { AzureStorageClient } from "../clients";
import { FrontendConfig } from "../configs";
import { TeamsBotConfig } from "../configs/teamsBotConfig";
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

@Service(BuiltInFeaturePluginNames.bot)
export class NodeJSBotPluginV3 implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.bot;
  displayName = "NodeJS Bot";
  public config: TeamsBotConfig = new TeamsBotConfig();

  async restoreConfigFromContext(
    context: v2.Context,
    inputs: Inputs,
    envInfo?: v3.EnvInfoV3
  ): Promise<void> {
    await this.scaffold.restoreConfigFromContext(context);
    await this.provision.restoreConfigFromContext(context);
    await this.localDebug.restoreConfigFromContext(context);
    await this.deploy.restoreConfigFromContext(context);

    this.teamsAppClientId = context.envInfo.state
      .get(PluginAAD.PLUGIN_NAME)
      ?.get(PluginAAD.CLIENT_ID) as string;

    this.teamsAppClientSecret = context.envInfo.state
      .get(PluginAAD.PLUGIN_NAME)
      ?.get(PluginAAD.CLIENT_SECRET) as string;

    this.teamsAppTenant = context.envInfo.state
      .get(PluginSolution.PLUGIN_NAME)
      ?.get(PluginSolution.M365_TENANT_ID) as string;

    this.applicationIdUris = context.envInfo.state
      .get(PluginAAD.PLUGIN_NAME)
      ?.get(PluginAAD.APPLICATION_ID_URIS) as string;

    const capabilities = (context.projectSettings?.solutionSettings as AzureSolutionSettings)
      .capabilities;

    if (capabilities?.includes(PluginActRoles.Bot) && !this.actRoles.includes(PluginActRoles.Bot)) {
      this.actRoles.push(PluginActRoles.Bot);
    }

    if (
      capabilities?.includes(PluginActRoles.MessageExtension) &&
      !this.actRoles.includes(PluginActRoles.MessageExtension)
    ) {
      this.actRoles.push(PluginActRoles.MessageExtension);
    }

    const resourceNameSuffixValue: ConfigValue = context.envInfo.state
      .get(PluginSolution.PLUGIN_NAME)
      ?.get(PluginSolution.RESOURCE_NAME_SUFFIX);
    this.resourceNameSuffix = resourceNameSuffixValue
      ? (resourceNameSuffixValue as string)
      : utils.genUUID();
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void | undefined, FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    await this.config.restoreConfigFromContext(context);
    Logger.info(Messages.ScaffoldingBot);

    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.SCAFFOLD_TITLE,
      ProgressBarConstants.SCAFFOLD_STEPS_NUM,
      this.ctx
    );
    await handler?.start(ProgressBarConstants.SCAFFOLD_STEP_START);

    // 1. Copy the corresponding template project into target directory.
    // Get group name.
    const group_name = TemplateProjectsConstants.GROUP_NAME_BOT_MSGEXT;
    if (!this.config.actRoles || this.config.actRoles.length === 0) {
      throw new SomethingMissingError("act roles");
    }

    // const hasBot = this.config.actRoles.includes(PluginActRoles.Bot);
    // const hasMsgExt = this.config.actRoles.includes(PluginActRoles.MessageExtension);
    // if (hasBot && hasMsgExt) {
    // group_name = TemplateProjectsConstants.GROUP_NAME_BOT_MSGEXT;
    // } else if (hasBot) {
    //   group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
    // } else {
    //   group_name = TemplateProjectsConstants.GROUP_NAME_MSGEXT;
    // }

    await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_FETCH_ZIP);
    await LanguageStrategy.getTemplateProject(group_name, this.config);

    this.config.saveConfigIntoContext(context);
    Logger.info(Messages.SuccessfullyScaffoldedBot);
    return ok(undefined);
  }
  @hooks([
    CommonErrorHandlerMW({
      telemetry: {
        component: BuiltInFeaturePluginNames.frontend,
        eventName: "generate-arm-templates",
      },
    }),
  ])
  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
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
    return ok([{ kind: "bicep", template: result }]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
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
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async afterOtherFeaturesAdded(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.OtherFeaturesAddedInputs
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    ctx.logProvider.info(Messages.StartUpdateArmTemplates(this.name));
    const result: ArmTemplateResult = {
      Reference: {
        endpoint: FrontendOutputBicepSnippet.Endpoint,
        domain: FrontendOutputBicepSnippet.Domain,
      },
    };
    return ok([{ kind: "bicep", template: result }]);
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
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
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
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
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
