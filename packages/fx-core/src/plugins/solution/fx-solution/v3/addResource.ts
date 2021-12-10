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
import { ResourceAlreadyAddedError } from "./error";
import { createSelectModuleQuestionNode, selectResourceQuestion } from "./questions";

function getAllResourcePlugins(): v3.ResourcePlugin[] {
  return [];
}

export async function getQuestionsForAddResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const node = new QTreeNode({ type: "group" });
  const moduleNode = createSelectModuleQuestionNode(solutionSettings.modules);
  node.addChild(moduleNode);
  const resourcePlugins = getAllResourcePlugins();
  const resourceNode = new QTreeNode(selectResourceQuestion);
  const staticOptions: OptionItem[] = [];
  for (const plugin of resourcePlugins) {
    staticOptions.push({
      id: plugin.name,
      label: plugin.resourceType,
      detail: plugin.description,
    });
  }
  selectResourceQuestion.staticOptions = staticOptions;
  node.addChild(resourceNode);
  return ok(node);
}
export async function addResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { module?: number; resource: string }
): Promise<Result<Void, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  if (inputs.module !== undefined) {
    const module = solutionSettings.modules[inputs.module];
    if (module.hostingPlugin === inputs.resource) {
      return err(new ResourceAlreadyAddedError(inputs.resource));
    }
    module.hostingPlugin = inputs.resource;
  }
  // add resource in activeResourcePlugins and collect all resource names
  const addedResourceNames = new Set<string>();
  const plugin = Container.get<v3.ResourcePlugin>(inputs.resource);
  if (!solutionSettings.activeResourcePlugins.includes(inputs.resource)) {
    solutionSettings.activeResourcePlugins.push(inputs.resource);
    addedResourceNames.add(plugin.name);
  }
  if (plugin.pluginDependencies) {
    const depRes = await plugin.pluginDependencies(ctx, inputs);
    if (depRes.isErr()) {
      return err(depRes.error);
    }
    for (const dep of depRes.value) {
      if (!solutionSettings.activeResourcePlugins.includes(dep)) {
        solutionSettings.activeResourcePlugins.push(dep);
        addedResourceNames.add(plugin.name);
      }
    }
  }
  // execute all newly added plugins' addResource() and generateResourceTemplate()
  for (const pluginName of addedResourceNames.values()) {
    const plugin = Container.get<v3.ResourcePlugin>(pluginName);
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
  }
  return ok(Void);
}
