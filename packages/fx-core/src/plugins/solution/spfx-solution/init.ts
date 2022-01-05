// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, QTreeNode, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import Container from "typedi";
import { HostTypeOptionSPFx, TabSPFxItem } from "../fx-solution/question";
import { BuiltInScaffoldPluginNames, BuiltInSolutionNames } from "../fx-solution/v3/constants";
import { TeamsSPFxSolutionQuestions } from "./questions";

export async function getQuestionsForInit(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({
    name: "set-spfx-solution",
    type: "func",
    func: (inputs: Inputs) => {
      inputs[TeamsSPFxSolutionQuestions.Solution] = BuiltInSolutionNames.spfx;
    },
  });
  node.condition = { contains: TabSPFxItem.id };

  const plugins = getAllScaffoldPlugins();
  for (const plugin of plugins) {
    if (plugin.getQuestionsForScaffold) {
      const pluginQuestionsRes = await plugin.getQuestionsForScaffold(ctx, inputs);
      if (pluginQuestionsRes.isOk()) {
        const pluginNode = pluginQuestionsRes.value;
        if (pluginNode) {
          node.addChild(pluginNode);
        }
      }
    }
  }

  return ok(node);
}

export async function init(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<Void, FxError>> {
  const solutionSettings: v3.TeamsSPFxSolutionSettings = {
    version: "3.0.0",
    name: ctx.projectSetting.solutionSettings.name,
    capabilities: ["tab"],
    hostType: HostTypeOptionSPFx.id,
    modules: [],
    activeResourcePlugins: [],
  };

  ctx.projectSetting.solutionSettings = solutionSettings;
  return ok(Void);
}

function getAllScaffoldPlugins() {
  return [Container.get<v3.ScaffoldPlugin>(BuiltInScaffoldPluginNames.spfx)];
}
