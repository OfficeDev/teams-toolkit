// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  err,
  FxError,
  ok,
  Result,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { PluginDisplayName } from "../../../../common/constants";
import { SolutionError, SolutionSource } from "../constants";

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
