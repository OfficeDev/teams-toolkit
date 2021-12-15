// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, Json, ok, QTreeNode, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import { CapabilityAlreadyAddedError } from "./error";
import { selectCapabilitiesQuestion } from "./questions";

export async function getQuestionsForAddModule(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(new QTreeNode(selectCapabilitiesQuestion));
}
export async function addModule(
  ctx: v2.Context,
  localSettings: Json,
  inputs: v2.InputsWithProjectPath & { capabilities?: string[] }
): Promise<Result<Void, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const module: v3.Module = {
    capabilities: inputs.capabilities || [],
  };
  const capSet = new Set<string>();
  solutionSettings.modules.forEach((m) => m.capabilities.forEach((c) => capSet.add(c)));
  for (const cap of inputs.capabilities || []) {
    if (capSet.has(cap)) {
      return err(new CapabilityAlreadyAddedError(cap));
    } else {
      capSet.add(cap);
    }
  }
  solutionSettings.capabilities = Array.from(capSet);
  solutionSettings.modules.push(module);
  //TODO
  //call localDebug plugin's scaffold API
  return ok(Void);
}
