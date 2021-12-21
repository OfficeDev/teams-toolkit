// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, QTreeNode, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import { BuiltInSolutionNames } from "./constants";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
} from "../question";

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
  const solutionSettings: v3.TeamsFxSolutionSettings = {
    version: "3.0.0",
    name: ctx.projectSetting.solutionSettings.name,
    capabilities: [],
    hostType: "Azure",
    azureResources: [],
    modules: [],
    activeResourcePlugins: [],
  };
  ctx.projectSetting.solutionSettings = solutionSettings;
  return ok(Void);
}
