// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  AzureSolutionSettings,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  err,
  FxError,
  Json,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  TokenProvider,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { PluginDisplayName } from "../../../../common/constants";
import { executeConcurrently } from "../v2/executor";
import { selectMultiPluginsQuestion } from "../../utils/questions";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { SolutionError, SolutionSource } from "../constants";

export async function getQuestionsForDeploy(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSetting = ctx.projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  const pluginNames = solutionSetting ? solutionSetting.activeResourcePlugins : [];
  if (pluginNames.length === 0) return ok(undefined);
  const rootNode = new QTreeNode(selectMultiPluginsQuestion);
  const deployOptions: OptionItem[] = [];
  const pluginPrefix = "fx-resource-";
  for (const pluginName of pluginNames) {
    if (pluginName) {
      const plugin = Container.get<v3.PluginV3>(pluginName);
      if (plugin.deploy) {
        deployOptions.push({
          id: pluginName,
          label: plugin.displayName || pluginName,
          cliName: plugin.name.replace(pluginPrefix, ""),
        });
        if (plugin.getQuestionsForDeploy) {
          const res = await plugin.getQuestionsForDeploy(ctx, inputs, envInfo, tokenProvider);
          if (res.isErr()) {
            return res;
          }
          if (res.value) {
            const node = res.value;
            if (node && node.data) {
              node.condition = { contains: pluginName };
              rootNode.addChild(node);
            }
          }
        }
      }
    }
  }
  selectMultiPluginsQuestion.staticOptions = deployOptions;
  return ok(rootNode);
}
export async function deploy(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider,
  telemetryProps?: Json
): Promise<Result<Void, FxError>> {
  const solutionSetting = ctx.projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  const pluginNames = solutionSetting ? solutionSetting.activeResourcePlugins : [];
  const plugins = pluginNames
    .map((name) => Container.get<v3.PluginV3>(name))
    .filter((p) => p.deploy !== undefined);
  if (plugins.length === 0) return ok(Void);
  const thunks = plugins.map((plugin) => {
    return {
      pluginName: `${plugin.name}`,
      taskName: "deploy",
      thunk: () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return plugin.deploy!(ctx, inputs, envInfo, tokenProvider);
      },
    };
  });
  ctx.logProvider.info(
    getLocalizedString(
      "core.deploy.selectedPluginsToDeployNotice",
      PluginDisplayName.Solution,
      JSON.stringify(thunks.map((p) => p.pluginName))
    )
  );
  ctx.logProvider.info(getLocalizedString("core.deploy.startNotice", PluginDisplayName.Solution));
  const result = await executeConcurrently(thunks, ctx.logProvider);

  if (result.kind === "success") {
    const msg = getLocalizedString("core.deploy.successNotice", ctx.projectSetting.appName);
    ctx.logProvider.info(msg);
    ctx.userInteraction.showMessage("info", msg, false);
    return ok(Void);
  } else {
    const msg = getLocalizedString("core.deploy.failNotice", ctx.projectSetting.appName);
    ctx.logProvider.info(msg);
    return err(result.error);
  }
}

/**
 * make sure subscription is correct before deployment
 *
 */
export async function checkDeployAzureSubscription(
  ctx: v2.Context,
  envInfo: v3.EnvInfoV3,
  azureAccountProvider: AzureAccountProvider
): Promise<Result<Void, FxError>> {
  const subscriptionIdInConfig =
    envInfo.config.azure?.subscriptionId || (envInfo.state.solution.subscriptionId as string);
  const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
  if (!subscriptionIdInConfig) {
    if (subscriptionInAccount) {
      envInfo.state.solution.subscriptionId = subscriptionInAccount.subscriptionId;
      envInfo.state.solution.subscriptionName = subscriptionInAccount.subscriptionName;
      envInfo.state.solution.tenantId = subscriptionInAccount.tenantId;
      ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
      return ok(Void);
    } else {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.SubscriptionNotFound,
          "Failed to select subscription"
        )
      );
    }
  }
  // make sure the user is logged in
  await azureAccountProvider.getIdentityCredentialAsync(true);
  // verify valid subscription (permission)
  const subscriptions = await azureAccountProvider.listSubscriptions();
  const targetSubInfo = subscriptions.find(
    (item) => item.subscriptionId === subscriptionIdInConfig
  );
  if (!targetSubInfo) {
    return err(
      new UserError(
        SolutionSource,
        SolutionError.SubscriptionNotFound,
        `The subscription '${subscriptionIdInConfig}'(${
          envInfo.state.solution.subscriptionName
        }) for '${
          envInfo.envName
        }' environment is not found in the current account, please use the right Azure account or check the '${EnvConfigFileNameTemplate.replace(
          EnvNamePlaceholder,
          envInfo.envName
        )}' file.`
      )
    );
  }
  envInfo.state.solution.subscriptionId = targetSubInfo.subscriptionId;
  envInfo.state.solution.subscriptionName = targetSubInfo.subscriptionName;
  envInfo.state.solution.tenantId = targetSubInfo.tenantId;
  ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
  return ok(Void);
}
