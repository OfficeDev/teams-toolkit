// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, QTreeNode, Result, v2, v3, Void } from "@microsoft/teamsfx-api";

export async function getQuestionsForAddResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}
export async function addResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { moduleIndex: number; pluginName: string }
): Promise<Result<Void, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const module = solutionSettings.modules[inputs.moduleIndex];
  module.hostingPlugin = inputs.pluginName;
  //TODO
  //call plugin's.addResource() API
  //call plugin's generateArmTemplates()/updateArmTemplates() API;
  return ok(Void);
}
