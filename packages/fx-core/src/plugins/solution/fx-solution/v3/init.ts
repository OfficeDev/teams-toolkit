// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, QTreeNode, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import { SolutionNameV3 } from "./constants";

export async function getQuestionsForInit(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}

export async function init(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { capabilities: string[] }
): Promise<Result<Void, FxError>> {
  const solutionSettings: v3.TeamsFxSolutionSettings = {
    version: "3.0.0",
    name: SolutionNameV3,
    capabilities: inputs.capabilities,
    hostType: "",
    azureResources: [],
    modules: [],
    activeResourcePlugins: [],
  };
  if (inputs.capabilities.length > 0) {
    solutionSettings.modules.push({
      capabilities: inputs.capabilities,
    });
  }
  ctx.projectSetting.solutionSettings = solutionSettings;
  return ok(Void);
}
