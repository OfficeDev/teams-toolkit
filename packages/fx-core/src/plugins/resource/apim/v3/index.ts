// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  ok,
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
import { Bicep, ConstantString } from "../../../../common/constants";
import { generateBicepFromFile } from "../../../../common/tools";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { getTemplatesFolder } from "../../../../folder";
import { AzureResourceApim } from "../../../solution/fx-solution/question";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { buildAnswer } from "../answer";
import { AadPluginConfig, ApimPluginConfig, FunctionPluginConfig, SolutionConfig } from "../config";
import {
  AadDefaultValues,
  ApimOutputBicepSnippet,
  ApimPathInfo,
  ApimPluginConfigKeys,
  PluginLifeCycle,
  PluginLifeCycleToProgressStep,
  ProgressMessages,
  ProgressStep,
} from "../constants";
import { AssertNotEmpty } from "../error";
import { Factory } from "../factory";
import { ProgressBar } from "../utils/progressBar";
import fs from "fs-extra";
@Service(BuiltInFeaturePluginNames.apim)
export class ApimPluginV3 implements v3.PluginV3 {
  name = BuiltInFeaturePluginNames.apim;
  displayName = "API Management";
  private progressBar: ProgressBar = new ProgressBar();
  async getQuestionsForDeploy(
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const apimConfig = new ApimPluginConfig(envInfo.state[this.name], envInfo.envName);
    const questionManager = await Factory.buildQuestionManager(
      inputs.platform,
      envInfo as v3.EnvInfoV3,
      tokenProvider.azureAccountProvider,
      ctx.telemetryReporter,
      ctx.logProvider
    );
    const node = await questionManager.deploy(
      inputs.projectPath,
      envInfo as v3.EnvInfoV3,
      apimConfig
    );
    return ok(node);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.apim } })])
  async generateCode(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void, FxError>> {
    const apimConfig = new ApimPluginConfig({}, "");
    const answer = buildAnswer(inputs);
    const scaffoldManager = await Factory.buildScaffoldManager(
      ctx.telemetryReporter,
      ctx.logProvider
    );
    const appName = ctx.projectSetting.appName;
    if (answer.validate) {
      await answer.validate(PluginLifeCycle.Scaffold, apimConfig, inputs.projectPath);
    }
    answer.save(PluginLifeCycle.Scaffold, apimConfig);
    await scaffoldManager.scaffold(appName, inputs.projectPath);
    return ok(Void);
  }

  @hooks([
    CommonErrorHandlerMW({
      telemetry: {
        component: BuiltInFeaturePluginNames.apim,
        eventName: "generate-arm-templates",
      },
    }),
  ])
  async generateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.AddFeatureInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const pluginCtx = { plugins: inputs.allPluginsAfterAdd };
    const bicepTemplateDir = path.join(getTemplatesFolder(), ApimPathInfo.BicepTemplateRelativeDir);
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, ApimPathInfo.ProvisionModuleFileName),
      pluginCtx
    );
    const configOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ConfigFileName),
      pluginCtx
    );
    const configModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, ApimPathInfo.ConfigurationModuleFileName),
      pluginCtx
    );
    const result: v3.BicepTemplate = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { apim: provisionModules },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { apim: configModules },
      },
      Reference: {
        serviceResourceId: ApimOutputBicepSnippet.ServiceResourceId,
      },
      Parameters: JSON.parse(
        await fs.readFile(
          path.join(bicepTemplateDir, Bicep.ParameterFileName),
          ConstantString.UTF8Encoding
        )
      ),
    };
    return ok([result]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.apim } })])
  async addInstance(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<string[], FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    const azureResources = solutionSettings.azureResources;
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    if (!azureResources.includes(AzureResourceApim.id)) azureResources.push(AzureResourceApim.id);
    return ok([]);
  }
  @hooks([
    CommonErrorHandlerMW({
      telemetry: { component: BuiltInFeaturePluginNames.apim, eventName: "update-arm-templates" },
    }),
  ])
  async updateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.UpdateInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const pluginCtx = { plugins: inputs.allPluginsAfterAdd };
    const bicepTemplateDir = path.join(getTemplatesFolder(), ApimPathInfo.BicepTemplateRelativeDir);
    const configModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, ApimPathInfo.ConfigurationModuleFileName),
      pluginCtx
    );
    const result: v3.BicepTemplate = {
      Reference: {
        serviceResourceId: ApimOutputBicepSnippet.ServiceResourceId,
      },
      Configuration: {
        Modules: { apim: configModules },
      },
    };
    return ok([result]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.apim } })])
  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    await this.progressBar.init(
      PluginLifeCycleToProgressStep[PluginLifeCycle.Provision],
      ctx.userInteraction
    );
    const apimState = envInfo.state[this.name] as v3.APIM;
    if (!apimState.secretFields) {
      apimState.secretFields = ["apimClientAADClientSecret"];
    }
    const apimConfig = new ApimPluginConfig(envInfo.state[this.name], envInfo.envName);

    const apimManager = await Factory.buildApimManager(
      envInfo,
      ctx.telemetryReporter,
      tokenProvider.azureAccountProvider,
      ctx.logProvider
    );
    const aadManager = await Factory.buildAadManager(
      tokenProvider.m365TokenProvider,
      ctx.telemetryReporter,
      ctx.logProvider
    );

    const appName = AssertNotEmpty("projectSettings.appName", ctx.projectSetting.appName);

    await this.progressBar.next(
      ProgressStep.Provision,
      ProgressMessages[ProgressStep.Provision].CreateApim
    );
    await apimManager.provision(apimConfig);

    await this.progressBar.next(
      ProgressStep.Provision,
      ProgressMessages[ProgressStep.Provision].CreateAad
    );
    await aadManager.provision(apimConfig, appName);

    await this.progressBar.close(ProgressStep.Provision, true);
    return ok(Void);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.apim } })])
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    const apimResource = envInfo.state[this.name];
    const apimConfig = new ApimPluginConfig(apimResource, envInfo.envName);
    const aadConfig = new AadPluginConfig(envInfo);
    const aadManager = await Factory.buildAadManager(
      tokenProvider.m365TokenProvider,
      ctx.telemetryReporter,
      ctx.logProvider
    );
    const teamsAppAadManager = await Factory.buildTeamsAppAadManager(
      tokenProvider.m365TokenProvider,
      ctx.telemetryReporter,
      ctx.logProvider
    );
    await this.progressBar.next(
      ProgressStep.PostProvision,
      ProgressMessages[ProgressStep.PostProvision].ConfigClientAad
    );
    await aadManager.postProvision(apimConfig, aadConfig, AadDefaultValues.redirectUris);

    await this.progressBar.next(
      ProgressStep.PostProvision,
      ProgressMessages[ProgressStep.PostProvision].ConfigApim
    );
    await this.progressBar.next(
      ProgressStep.PostProvision,
      ProgressMessages[ProgressStep.PostProvision].ConfigAppAad
    );
    await teamsAppAadManager.postProvision(aadConfig, apimConfig);

    // Delete user sensitive configuration
    delete apimResource[ApimPluginConfigKeys.publisherEmail];
    delete apimResource[ApimPluginConfigKeys.publisherName];
    return ok(Void);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    const solutionConfig = new SolutionConfig(envInfo as v3.EnvInfoV3);
    const apimConfig = new ApimPluginConfig(envInfo.state[this.name], envInfo.envName);
    const functionConfig = new FunctionPluginConfig(envInfo as v3.EnvInfoV3);
    const answer = buildAnswer(inputs);

    if (answer.validate) {
      await answer.validate(PluginLifeCycle.Deploy, apimConfig, inputs.projectPath);
    }

    answer.save(PluginLifeCycle.Deploy, apimConfig);

    const apimManager = await Factory.buildApimManager(
      envInfo as v3.EnvInfoV3,
      ctx.telemetryReporter,
      tokenProvider.azureAccountProvider,
      ctx.logProvider
    );

    await this.progressBar.next(
      ProgressStep.Deploy,
      ProgressMessages[ProgressStep.Deploy].ImportApi
    );
    await apimManager.deploy(
      apimConfig,
      solutionConfig,
      functionConfig,
      answer,
      inputs.projectPath
    );
    return ok(Void);
  }
}
