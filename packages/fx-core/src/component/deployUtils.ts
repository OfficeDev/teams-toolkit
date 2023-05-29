// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  err,
  FxError,
  ok,
  Result,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../common/localizeUtils";
import { SolutionSource } from "./constants";
import { DriverContext } from "./driver/interface/commonArgs";

export class DeployUtils {
  async askForDeployConsent(
    ctx: v2.Context,
    azureAccountProvider: AzureAccountProvider,
    envInfo: v3.EnvInfoV3
  ): Promise<Result<Void, FxError>> {
    const azureTokenJson = await azureAccountProvider.getJsonObject();

    // Only Azure project requires this confirm dialog
    const username = (azureTokenJson as any).unique_name || "";
    const subscriptionId = envInfo.state.solution?.subscriptionId || "";
    const subscriptionName = envInfo.state.solution?.subscriptionName || "";
    const msg = getLocalizedString(
      "core.deploy.confirmEnvNotice",
      envInfo.envName,
      username,
      subscriptionName ? subscriptionName : subscriptionId
    );
    const deployOption = getLocalizedString("core.option.deploy");
    const result = await ctx.userInteraction.showMessage("warn", msg, true, deployOption);
    const choice = result?.isOk() ? result.value : undefined;

    if (choice === deployOption) {
      return ok(Void);
    }
    return err(new UserError(SolutionSource, "UserCancel", "UserCancel"));
  }

  async askForDeployConsentV3(ctx: DriverContext): Promise<Result<Void, FxError>> {
    const msg = getLocalizedString("core.deploy.confirmEnvNoticeV3", process.env.TEAMSFX_ENV);
    const deployOption = getLocalizedString("core.option.deploy");
    const result = await ctx.ui?.showMessage("warn", msg, true, deployOption);
    const choice = result?.isOk() ? result.value : undefined;
    if (choice === deployOption) {
      return ok(Void);
    }
    return err(new UserError(SolutionSource, "UserCancel", "UserCancel"));
  }
}
export const deployUtils = new DeployUtils();
