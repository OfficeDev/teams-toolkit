// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import * as util from "util";
import { PluginDisplayName } from "../../../../common/constants";
import { getStrings } from "../../../../common/tools";
import { executeConcurrently } from "../v2/executor";
import { createSelectModulesToDeployQuestionNode } from "./questions";
import { getModule } from "./utils";

export async function getQuestionsForDeploy(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSetting = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const root = createSelectModulesToDeployQuestionNode(solutionSetting.modules);
  let i = 0;
  for (const module of solutionSetting.modules) {
    const pluginName = module.hostingPlugin;
    if (pluginName) {
      const plugin = Container.get<v3.ResourcePlugin>(pluginName);
      if (plugin.deploy && plugin.getQuestionsForDeploy) {
        const res = await plugin.getQuestionsForDeploy(ctx, inputs, envInfo, tokenProvider);
        if (res.isErr()) {
          return res;
        }
        if (res.value) {
          const node = res.value;
          if (node && node.data) {
            node.condition = { contains: i + "" };
            root.addChild(node);
          }
        }
      }
    }
    ++i;
  }
  return ok(root);
}
export async function deploy(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { modules: string[] },
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider
): Promise<Result<Void, FxError>> {
  const solutionSetting = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const plugins = [];
  for (const moduleIndex of inputs.modules) {
    const module = getModule(solutionSetting, moduleIndex);
    if (module && module.hostingPlugin) {
      const plugin = Container.get<v3.ResourcePlugin>(module.hostingPlugin);
      plugins.push(plugin);
    }
  }
  const thunks = plugins.map((plugin) => {
    return {
      pluginName: `${plugin.name}`,
      taskName: "deploy",
      thunk: () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return plugin.deploy!(ctx, inputs, envInfo, tokenProvider.azureAccountProvider);
      },
    };
  });
  ctx.logProvider.info(
    util.format(
      getStrings().solution.SelectedPluginsToDeployNotice,
      PluginDisplayName.Solution,
      JSON.stringify(thunks.map((p) => p.pluginName))
    )
  );
  ctx.logProvider.info(
    util.format(getStrings().solution.DeployStartNotice, PluginDisplayName.Solution)
  );
  const result = await executeConcurrently(thunks, ctx.logProvider);

  if (result.kind === "success") {
    const msg = util.format(
      `Success: ${getStrings().solution.DeploySuccessNotice}`,
      ctx.projectSetting.appName
    );
    ctx.logProvider.info(msg);
    ctx.userInteraction.showMessage("info", msg, false);
    return ok(Void);
  } else {
    const msg = util.format(getStrings().solution.DeployFailNotice, ctx.projectSetting.appName);
    ctx.logProvider.info(msg);
    return err(result.error);
  }
}
