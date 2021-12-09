// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { ResourceAlreadyAddedError } from "../error";
import { addResourcesQuestion } from "./questions";

function getAllResourcePlugins(): v3.ResourcePlugin[] {
  return [];
}

export async function getQuestionsForAddResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const resourcePlugins = getAllResourcePlugins();
  const node = new QTreeNode(addResourcesQuestion);
  const staticOptions: OptionItem[] = [];
  for (const plugin of resourcePlugins) {
    staticOptions.push({
      id: plugin.name,
      label: plugin.resourceType,
      detail: plugin.description,
    });
  }
  addResourcesQuestion.staticOptions = staticOptions;
  return ok(node);
}
export async function addResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { module: number; resource: string }
): Promise<Result<Void, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const module = solutionSettings.modules[inputs.module];
  if (module.hostingPlugin === inputs.resource) {
    return err(new ResourceAlreadyAddedError(inputs.resource));
  }
  module.hostingPlugin = inputs.resource;
  const plugin = Container.get<v3.ResourcePlugin>(inputs.resource);
  if (plugin.addResource) {
    const res = await plugin.addResource(ctx, inputs);
    if (res.isErr()) {
      return err(res.error);
    }
  }
  if (plugin.generateResourceTemplate) {
    const res = await plugin.generateResourceTemplate(ctx, inputs);
    if (res.isErr()) {
      return err(res.error);
    }
  }
  return ok(Void);
}
