// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, QTreeNode, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import { assign, isUndefined } from "lodash";
import { Container } from "typedi";
import * as util from "util";
import { PluginDisplayName } from "../../../../common/constants";
import { getStrings } from "../../../../common/tools";
import { executeConcurrently } from "../v2/executor";
import { combineRecords } from "../v2/utils";

export async function getQuestionsForProvision(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSetting = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const root = new QTreeNode({ type: "group" });
  for (const pluginName of solutionSetting.activeResourcePlugins) {
    const plugin = Container.get<v3.ResourcePlugin>(pluginName);
    if (plugin.getQuestionsForProvision) {
      const res = await plugin.getQuestionsForProvision(ctx, inputs, envInfo, tokenProvider);
      if (res.isErr()) {
        return res;
      }
      if (res.value) {
        const node = res.value;
        if (node && node.data) {
          root.addChild(node);
        }
      }
    }
  }
  return ok(root);
}
export async function provisionResources(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider
): Promise<Result<v3.EnvInfoV3, FxError>> {
  // Just to trigger M365 login before the concurrent execution of provision.
  // await tokenProvider.appStudioToken.getAccessToken();

  // 1. check AAD permission request

  // 2. ask common question and fill in solution config

  // 3. ask for provision consent

  // 4. collect plugins

  const solutionSetting = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const plugins = solutionSetting.activeResourcePlugins.map((p) =>
    Container.get<v3.ResourcePlugin>(p)
  );
  const provisionThunks = plugins
    .filter((plugin) => !isUndefined(plugin.provisionResource))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "provisionResource",
        thunk: () => {
          if (!envInfo.state[plugin.name]) {
            envInfo.state[plugin.name] = {};
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return plugin.provisionResource!(ctx, inputs, envInfo, tokenProvider);
        },
      };
    });

  // call provisionResources and collect outputs
  ctx.logProvider?.info(
    util.format(getStrings().solution.ProvisionStartNotice, PluginDisplayName.Solution)
  );
  const provisionResult = await executeConcurrently(provisionThunks, ctx.logProvider);
  if (provisionResult.kind === "failure" || provisionResult.kind === "partialSuccess") {
    return err(provisionResult.error);
  } else {
    const update = combineRecords(provisionResult.output);
    assign(envInfo.state, update);
  }

  ctx.logProvider?.info(
    util.format(getStrings().solution.ProvisionFinishNotice, PluginDisplayName.Solution)
  );

  // call deployArmTemplates
  ctx.logProvider?.info(
    util.format(getStrings().solution.DeployArmTemplates.StartNotice, PluginDisplayName.Solution)
  );

  ctx.logProvider?.info(
    util.format(getStrings().solution.DeployArmTemplates.SuccessNotice, PluginDisplayName.Solution)
  );

  // call aad.setApplicationInContext
  ctx.logProvider?.info(util.format("AAD.setApplicationInContext", PluginDisplayName.Solution));

  const configureResourceThunks = plugins
    .filter((plugin) => !isUndefined(plugin.configureResource))
    .map((plugin) => {
      if (!envInfo.state[plugin.name]) {
        envInfo.state[plugin.name] = {};
      }
      return {
        pluginName: `${plugin.name}`,
        taskName: "configureResource",
        thunk: () =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.configureResource!(ctx, inputs, envInfo, tokenProvider),
      };
    });
  //call configResource
  const configureResourceResult = await executeConcurrently(
    configureResourceThunks,
    ctx.logProvider
  );
  ctx.logProvider?.info(
    util.format(getStrings().solution.ConfigurationFinishNotice, PluginDisplayName.Solution)
  );
  const envStates = envInfo.state as v3.TeamsFxAzureResourceStates;
  if (
    configureResourceResult.kind === "failure" ||
    configureResourceResult.kind === "partialSuccess"
  ) {
    const msg = util.format(getStrings().solution.ProvisionFailNotice, ctx.projectSetting.appName);
    ctx.logProvider.error(msg);
    envStates.solution.provisionSucceeded = false;
    return err(configureResourceResult.error);
  }

  // const url = getResourceGroupInPortal(
  //   envStates.solution.subscriptionId,
  //   envStates.solution.tenantId,
  //   envStates.solution.resourceGroupName
  // );
  const msg = util.format(
    `Success: ${getStrings().solution.ProvisionSuccessNotice}`,
    ctx.projectSetting.appName
  );
  ctx.logProvider?.info(msg);
  // if (url) {
  //   const title = "View Provisioned Resources";
  //   ctx.userInteraction.showMessage("info", msg, false, title).then((result) => {
  //     const userSelected = result.isOk() ? result.value : undefined;
  //     if (userSelected === title) {
  //       ctx.userInteraction.openUrl(url);
  //     }
  //   });
  // } else {
  //   ctx.userInteraction.showMessage("info", msg, false);
  // }
  return ok(envInfo);
}
