// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  Action,
  ActionContext,
  Bicep,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  ok,
  QTreeNode,
  ResourceContextV3,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { APIMOutputs, ComponentNames } from "../../constants";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { AzureResource } from "../azureResource";
import { buildAnswer } from "./answer";
import { AadPluginConfig, ApimPluginConfig, FunctionPluginConfig, SolutionConfig } from "./config";
import {
  AadDefaultValues,
  ApimPluginConfigKeys,
  PluginLifeCycle,
  ProgressMessages,
  ProgressStep,
  ProjectConstants,
} from "./constants";
import { AssertNotEmpty } from "./error";
import { Factory } from "./factory";
@Service(ComponentNames.APIM)
export class APIMResource extends AzureResource {
  readonly name = ComponentNames.APIM;
  readonly bicepModuleName = ComponentNames.APIM;
  outputs = APIMOutputs;
  finalOutputKeys = [
    "apimClientAADObjectId",
    "apimClientAADClientId",
    "apimClientAADClientSecret",
    "serviceResourceId",
    "productResourceId",
    "authServerResourceId",
  ];
  secretKeys = ["apimClientAADClientSecret"];

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-apim",
      telemetryEventName: PluginLifeCycle.GenerateArmTemplates,
      errorSource: ProjectConstants.pluginShortName,
    }),
  ])
  async generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Bicep[], FxError>> {
    return super.generateBicep(context, inputs);
  }

  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressSteps: 2,
      progressTitle: ProgressStep.Provision,
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-apim",
      telemetryEventName: PluginLifeCycle.Provision,
      errorSource: ProjectConstants.pluginShortName,
    }),
  ])
  async provision(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<Action | undefined, FxError>> {
    if (context.envInfo.envName !== "local") {
      context.envInfo.state[ComponentNames.APIM] = context.envInfo.state[ComponentNames.APIM] || {};
      const apimState = context.envInfo.state[ComponentNames.APIM];
      const apimConfig = new ApimPluginConfig(apimState, context.envInfo.envName);
      const apimManager = await Factory.buildApimManager(
        context.envInfo,
        context.telemetryReporter,
        context.tokenProvider.azureAccountProvider,
        context.logProvider
      );
      const aadManager = await Factory.buildAadManager(
        context.tokenProvider.m365TokenProvider,
        context.telemetryReporter,
        context.logProvider
      );
      const appName = AssertNotEmpty("projectSettings.appName", context.projectSetting.appName);
      await actionContext?.progressBar?.next(ProgressMessages[ProgressStep.Provision].CreateApim);
      await apimManager.provision(apimConfig);
      await actionContext?.progressBar?.next(ProgressMessages[ProgressStep.Provision].CreateAad);
      await aadManager.provision(apimConfig, appName);
    }
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressSteps: 3,
      progressTitle: ProgressStep.PostProvision,
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-apim",
      telemetryEventName: PluginLifeCycle.PostProvision,
      errorSource: ProjectConstants.pluginShortName,
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    if (context.envInfo.envName !== "local") {
      const apimResource = context.envInfo.state[ComponentNames.APIM];
      const apimConfig = new ApimPluginConfig(apimResource, context.envInfo.envName);
      const aadConfig = new AadPluginConfig(context.envInfo);
      const aadManager = await Factory.buildAadManager(
        context.tokenProvider.m365TokenProvider,
        context.telemetryReporter,
        context.logProvider
      );
      const teamsAppAadManager = await Factory.buildTeamsAppAadManager(
        context.tokenProvider.m365TokenProvider,
        context.telemetryReporter,
        context.logProvider
      );
      await actionContext?.progressBar?.next(
        ProgressMessages[ProgressStep.PostProvision].ConfigClientAad
      );
      await aadManager.postProvision(apimConfig, aadConfig, AadDefaultValues.redirectUris);
      await actionContext?.progressBar?.next(
        ProgressMessages[ProgressStep.PostProvision].ConfigAppAad
      );
      await teamsAppAadManager.postProvision(aadConfig, apimConfig);
      // Delete user sensitive configuration
      delete apimResource[ApimPluginConfigKeys.publisherEmail];
      delete apimResource[ApimPluginConfigKeys.publisherName];
    }
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressSteps: 1,
      progressTitle: ProgressStep.Deploy,
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-apim",
      telemetryEventName: PluginLifeCycle.Deploy,
      errorSource: ProjectConstants.pluginShortName,
      question: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return getQuestionsForDeployAPIM(context as ResourceContextV3, inputs);
      },
    }),
  ])
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const solutionConfig = new SolutionConfig(context.envInfo as v3.EnvInfoV3);
    const apimConfig = new ApimPluginConfig(
      context.envInfo.state[ComponentNames.APIM],
      context.envInfo.envName
    );
    const functionConfig = new FunctionPluginConfig(context.envInfo as v3.EnvInfoV3);
    const answer = buildAnswer(inputs);

    if (answer.validate) {
      await answer.validate(PluginLifeCycle.Deploy, apimConfig, inputs.projectPath);
    }

    answer.save(PluginLifeCycle.Deploy, apimConfig);

    const apimManager = await Factory.buildApimManager(
      context.envInfo as v3.EnvInfoV3,
      context.telemetryReporter,
      context.tokenProvider.azureAccountProvider,
      context.logProvider
    );

    await actionContext?.progressBar?.next(ProgressMessages[ProgressStep.Deploy].ImportApi);
    await apimManager.deploy(
      apimConfig,
      solutionConfig,
      functionConfig,
      answer,
      inputs.projectPath
    );
    return ok(undefined);
  }
}

export async function getQuestionsForDeployAPIM(
  context: ResourceContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const questionManager = await Factory.buildQuestionManager(
    inputs.platform,
    context.envInfo as v3.EnvInfoV3,
    context.tokenProvider.azureAccountProvider,
    context.telemetryReporter,
    context.logProvider
  );
  const apimState =
    context.envInfo && context.envInfo.state && context.envInfo.state[ComponentNames.APIM]
      ? context.envInfo.state[ComponentNames.APIM]
      : {};
  const apimConfig = context.envInfo
    ? new ApimPluginConfig(apimState, context.envInfo.envName)
    : undefined;
  const node = await questionManager.deploy(
    inputs.projectPath,
    context.envInfo as v3.EnvInfoV3,
    apimConfig
  );
  return ok(node);
}
