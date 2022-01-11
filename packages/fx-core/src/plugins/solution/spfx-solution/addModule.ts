// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Json, ok, Result, v2, v3, Void, err } from "@microsoft/teamsfx-api";
import { AddModuleNotSupportedError } from "./error";

export async function addModule(
  ctx: v2.Context,
  inputs: v3.SolutionAddModuleInputs,
  localSettings?: Json
): Promise<Result<Void, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsSPFxSolutionSettings;
  const module: v3.Module = {
    capabilities: inputs.capabilities || [],
  };
  const capSet = new Set<string>();
  solutionSettings.modules.forEach((m) => m.capabilities.forEach((c) => capSet.add(c)));
  for (const cap of inputs.capabilities || []) {
    if (capSet.has(cap)) {
      ctx.userInteraction.showMessage(
        "warn",
        "Add module is not supported for SPFx project!",
        false
      );
      return err(new AddModuleNotSupportedError());
    } else {
      capSet.add(cap);
    }
  }
  solutionSettings.capabilities = Array.from(capSet);
  solutionSettings.modules.push(module);

  return ok(Void);
}
