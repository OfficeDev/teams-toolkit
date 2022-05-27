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
import { getLocalizedString } from "../../../../common/localizeUtils";
import { OperationNotPermittedError } from "../../../../core";
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
    return await getQuestionsForAddCapability(ctx, inputs, func, envInfo, tokenProvider);
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
      return err(new OperationNotPermittedError("addResource"));
    }
    const alreadyHaveFunction = settings.activeResourcePlugins.includes(
      BuiltInFeaturePluginNames.function
    );
    const alreadyHaveSQL = settings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.sql);
    const alreadyHaveAPIM = settings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.apim);
    const alreadyHaveKeyVault = settings.activeResourcePlugins.includes(
      BuiltInFeaturePluginNames.keyVault
    );
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
    const plugin = Container.get<v3.PluginV3>(pluginName);
    if (plugin.getQuestionsForAddInstance) {
      const res = await plugin.getQuestionsForAddInstance(ctx, inputs);
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
  const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
  const features: string[] = [];
  if (!solutionSettings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.aad)) {
    features.push(BuiltInFeaturePluginNames.aad);
  }
  if (capabilitiesAnswer.includes(TabOptionItem.id)) {
    features.push(BuiltInFeaturePluginNames.frontend);
  }
  if (
    capabilitiesAnswer.includes(BotOptionItem.id) ||
    capabilitiesAnswer.includes(MessageExtensionItem.id)
  ) {
    features.push(BuiltInFeaturePluginNames.bot);
  }
  if (features.length > 0) {
    const addFeatureInputs: v3.SolutionAddFeatureInputs = {
      ...inputs,
      projectPath: inputs.projectPath,
      features: features,
    };
    const addFeatureRes = await addFeature(ctx, addFeatureInputs);
    if (addFeatureRes.isErr()) {
      return err(addFeatureRes.error);
    }
    if (capabilitiesAnswer.length > 0) {
      const addNames = capabilitiesAnswer.map((c) => `'${c}'`).join(" and ");
      const single = capabilitiesAnswer.length === 1;
      const template =
        inputs.platform === Platform.CLI
          ? single
            ? getLocalizedString("core.addCapability.addCapabilityNoticeForCli")
            : getLocalizedString("core.addCapability.addCapabilitiesNoticeForCli")
          : single
          ? getLocalizedString("core.addCapability.addCapabilityNotice")
          : getLocalizedString("core.addCapability.addCapabilitiesNotice");
      const msg = util.format(template, addNames);
      ctx.userInteraction.showMessage("info", msg, false);
    }
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
  const addFeatureInputs: v3.SolutionAddFeatureInputs = {
    ...inputs,
    projectPath: inputs.projectPath,
    features: [],
  };
  for (const resource of addResourcesAnswer) {
    if (resource === AzureResourceSQL.id) {
      addFeatureInputs.features.push(BuiltInFeaturePluginNames.sql);
    } else if (resource === AzureResourceApim.id) {
      addFeatureInputs.features.push(BuiltInFeaturePluginNames.apim);
    } else if (resource === AzureResourceFunction.id) {
      addFeatureInputs.features.push(BuiltInFeaturePluginNames.function);
    } else if (resource === AzureResourceKeyVault.id) {
      addFeatureInputs.features.push(BuiltInFeaturePluginNames.keyVault);
    }
  }
  if (addFeatureInputs.features.length > 0) {
    const addFeatureRes = await addFeature(ctx, addFeatureInputs);
    if (addFeatureRes.isErr()) return err(addFeatureRes.error);
    if (addResourcesAnswer.length > 0) {
      const addNames = addResourcesAnswer.join(" and ");
      const single = addResourcesAnswer.length === 1;
      const template =
        inputs.platform === Platform.CLI
          ? single
            ? getLocalizedString("core.addResource.addResourceNoticeForCli")
            : getLocalizedString("core.addResource.addResourcesNoticeForCli")
          : single
          ? getLocalizedString("core.addResource.addResourceNotice")
          : getLocalizedString("core.addResource.addResourcesNotice");
      ctx.userInteraction.showMessage("info", util.format(template, addNames), false);
    }
  }
  return ok(Void);
}
