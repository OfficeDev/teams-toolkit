// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  DynamicPlatforms,
  err,
  Func,
  FxError,
  Inputs,
  InvalidInputError,
  Json,
  MultiSelectQuestion,
  ok,
  Platform,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import * as util from "util";
import { getStrings } from "../../../../common/tools";
import { isVSProject, OperationNotSupportedForExistingAppError } from "../../../../core";
import { SolutionTelemetryProperty } from "../constants";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceKeyVault,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  createAddAzureResourceQuestion,
  MessageExtensionItem,
  TabOptionItem,
} from "../question";
import { ensureSolutionSettings } from "../utils/solutionSettingsHelper";
import { canAddResource } from "../v2/executeUserTask";
import { getQuestionsForAddCapability } from "../v2/getQuestions";
import { addFeature } from "./addFeature";
import { BuiltInFeaturePluginNames } from "./constants";

export async function getQuestionsForUserTask(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (func.method === "addCapability") {
    return await getQuestionsForAddCapability(ctx, inputs);
  }
  if (func.method === "addResource") {
    return await getQuestionsForAddResource(ctx, inputs);
  }
  return ok(undefined);
}

export async function getQuestionsForAddResource(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const settings = ctx.projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  let addQuestion: MultiSelectQuestion;
  if (!isDynamicQuestion) {
    addQuestion = createAddAzureResourceQuestion(false, false, false, false);
  } else {
    if (!settings) {
      return err(new OperationNotSupportedForExistingAppError("addResource"));
    }
    const alreadyHaveFunction = settings.azureResources.includes(AzureResourceFunction.id);
    const alreadyHaveSQL = settings.azureResources.includes(AzureResourceSQL.id);
    const alreadyHaveAPIM = settings.azureResources.includes(AzureResourceApim.id);
    const alreadyHaveKeyVault = settings.azureResources.includes(AzureResourceKeyVault.id);
    addQuestion = createAddAzureResourceQuestion(
      alreadyHaveFunction,
      alreadyHaveSQL,
      alreadyHaveAPIM,
      alreadyHaveKeyVault
    );
    const canProceed = canAddResource(ctx.projectSetting, ctx.telemetryReporter);
    if (canProceed.isErr()) {
      return err(canProceed.error);
    }
  }
  const addAzureResourceNode = new QTreeNode(addQuestion);
  //traverse plugins' getQuestionsForAddFeature
  const pluginsWithResources = [
    [BuiltInFeaturePluginNames.function, AzureResourceFunction.id],
    [BuiltInFeaturePluginNames.sql, AzureResourceSQL.id],
    [BuiltInFeaturePluginNames.apim, AzureResourceApim.id],
    [BuiltInFeaturePluginNames.keyVault, AzureResourceKeyVault.id],
  ];
  for (const pair of pluginsWithResources) {
    const pluginName = pair[0];
    const resourceName = pair[1];
    const plugin = Container.get<v3.FeaturePlugin>(pluginName);
    if (plugin.getQuestionsForAddFeature) {
      const res = await plugin.getQuestionsForAddFeature(ctx, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const node = res.value as QTreeNode;
        node.condition = { contains: resourceName };
        if (node.data) addAzureResourceNode.addChild(node);
      }
    }
  }
  return ok(addAzureResourceNode);
}

export async function addCapability(
  ctx: v2.Context,
  inputs: Inputs,
  telemetryProps?: any
): Promise<Result<Void, FxError>> {
  if (!inputs.projectPath) {
    return err(new InvalidInputError("solution", "inputs.projectPath is undefined"));
  }
  ensureSolutionSettings(ctx.projectSetting);
  const capabilitiesAnswer = inputs[AzureSolutionQuestionNames.Capabilities] as string[];
  if (telemetryProps) {
    telemetryProps[SolutionTelemetryProperty.Capabilities] = capabilitiesAnswer.join(";");
  }
  const vsProject = isVSProject(ctx.projectSetting);
  if (vsProject) {
    const addFeatureInputs: v3.SolutionAddFeatureInputs = {
      ...inputs,
      projectPath: inputs.projectPath,
      feature: BuiltInFeaturePluginNames.dotnet,
    };
    const addFeatureRes = await addFeature(ctx, addFeatureInputs);
    if (addFeatureRes.isErr()) return err(addFeatureRes.error);
  } else {
    for (const capability of capabilitiesAnswer) {
      let resourcePluginName: string | undefined;
      if (capability === TabOptionItem.id) {
        resourcePluginName = BuiltInFeaturePluginNames.frontend;
      } else if (capability === BotOptionItem.id || capability === MessageExtensionItem.id) {
        resourcePluginName = BuiltInFeaturePluginNames.bot;
      }
      if (resourcePluginName) {
        const addFeatureInputs: v3.SolutionAddFeatureInputs = {
          ...inputs,
          projectPath: inputs.projectPath,
          feature: resourcePluginName,
        };
        const addFeatureRes = await addFeature(ctx, addFeatureInputs);
        if (addFeatureRes.isErr()) return err(addFeatureRes.error);
      }
    }
  }
  if (capabilitiesAnswer.length > 0) {
    const addNames = capabilitiesAnswer.map((c) => `'${c}'`).join(" and ");
    const single = capabilitiesAnswer.length === 1;
    const template =
      inputs.platform === Platform.CLI
        ? single
          ? getStrings().solution.addCapability.AddCapabilityNoticeForCli
          : getStrings().solution.addCapability.AddCapabilitiesNoticeForCli
        : single
        ? getStrings().solution.addCapability.AddCapabilityNotice
        : getStrings().solution.addCapability.AddCapabilitiesNotice;
    const msg = util.format(template, addNames);
    ctx.userInteraction.showMessage("info", msg, false);
  }
  return ok(Void);
}

export async function addResource(
  ctx: v2.Context,
  inputs: Inputs,
  telemetryProps?: Json
): Promise<Result<Void, FxError>> {
  if (!inputs.projectPath) {
    return err(new InvalidInputError("solution", "inputs.projectPath is undefined"));
  }
  ensureSolutionSettings(ctx.projectSetting);
  const addResourcesAnswer = inputs[AzureSolutionQuestionNames.AddResources] as string[];
  if (telemetryProps) {
    telemetryProps[SolutionTelemetryProperty.Resources] = addResourcesAnswer.join(";");
  }
  for (const resource of addResourcesAnswer) {
    let resourcePluginName: string | undefined;
    if (resource === AzureResourceSQL.id) {
      resourcePluginName = BuiltInFeaturePluginNames.sql;
    } else if (resource === AzureResourceApim.id) {
      resourcePluginName = BuiltInFeaturePluginNames.apim;
    } else if (resource === AzureResourceFunction.id) {
      resourcePluginName = BuiltInFeaturePluginNames.function;
    } else if (resource === AzureResourceKeyVault.id) {
      resourcePluginName = BuiltInFeaturePluginNames.keyVault;
    }
    if (resourcePluginName) {
      const addFeatureInputs: v3.SolutionAddFeatureInputs = {
        ...inputs,
        projectPath: inputs.projectPath,
        feature: resourcePluginName,
      };
      const addFeatureRes = await addFeature(ctx, addFeatureInputs);
      if (addFeatureRes.isErr()) return err(addFeatureRes.error);
    }
  }
  if (addResourcesAnswer.length > 0) {
    const addNames = addResourcesAnswer.join(" and ");
    const single = addResourcesAnswer.length === 1;
    const template =
      inputs.platform === Platform.CLI
        ? single
          ? getStrings().solution.addResource.AddResourceNoticeForCli
          : getStrings().solution.addResource.AddResourcesNoticeForCli
        : single
        ? getStrings().solution.addResource.AddResourceNotice
        : getStrings().solution.addResource.AddResourcesNotice;
    ctx.userInteraction.showMessage("info", util.format(template, addNames), false);
  }
  return ok(Void);
}
