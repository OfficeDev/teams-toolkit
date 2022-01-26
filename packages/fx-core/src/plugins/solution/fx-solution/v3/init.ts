// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, Inputs, ok, QTreeNode, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import { BuiltInResourcePluginNames, BuiltInSolutionNames } from "./constants";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
} from "../question";
import { Container } from "typedi";
import { AppStudioPluginV3 } from "../../../resource/appstudio/v3";

export async function getQuestionsForInit(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({
    name: "set-azure-solution",
    type: "func",
    func: (inputs: Inputs) => {
      inputs[AzureSolutionQuestionNames.Solution] = BuiltInSolutionNames.azure;
    },
  });
  node.condition = { containsAny: [TabOptionItem.id, BotOptionItem.id, MessageExtensionItem.id] };
  return ok(node);
}

export async function init(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<Void, FxError>> {
  // 1. init solution settings
  const solutionSettings: v3.TeamsFxSolutionSettings = {
    version: "3.0.0",
    name: BuiltInSolutionNames.azure,
    capabilities: [],
    hostType: "Azure",
    azureResources: [],
    modules: [],
    activeResourcePlugins: [],
  };
  ctx.projectSetting.solutionSettings = solutionSettings;
  // 2. call appStudio.init() to generate manifest templates
  const appStudio = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);
  const initManifestRes = await appStudio.init(ctx, inputs);
  if (initManifestRes.isErr()) {
    return err(initManifestRes.error);
  }
  return ok(Void);
}
