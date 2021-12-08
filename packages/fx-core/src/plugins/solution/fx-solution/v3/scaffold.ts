// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, QTreeNode, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import Container from "typedi";

export async function getQuestionsForScaffold(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}
export async function scaffold(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { moduleIndex: number; pluginName: string }
): Promise<Result<Void, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const module = solutionSettings.modules[inputs.moduleIndex];
  module.hostingPlugin = inputs.pluginName;
  //TODO
  const plugin = Container.get<v3.ScaffoldPlugin>(inputs.pluginName);
  const res = await plugin.scaffold(ctx, inputs as any as v3.ScaffoldInputs);
  if (res.isErr()) {
    return err(res.error);
  }
  const manifest = [];
  if (res.value) {
    manifest.push(res.value);
  }
  inputs.manifest = manifest;
  //call plugin's.scaffold() API
  const appstudioPlugin = Container.get<v3.ScaffoldPlugin>("fx-resource-appstudio");
  appstudioPlugin.scaffold(ctx, inputs as any as v3.ScaffoldInputs);
  return ok(Void);
}
