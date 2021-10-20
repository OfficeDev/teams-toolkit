// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, ok } from "@microsoft/teamsfx-api";
import { FrontendPluginInfo as PluginInfo } from "./constants";
import { Logger } from "./utils/logger";
import { Messages } from "./resources/messages";
import { TeamsFxResult } from "./error-factory";
import { ProgressHelper } from "./utils/progress-helper";

export class BlazorPluginImpl {
  public async provision(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartProvision(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.startProvisionProgressHandler(ctx);

    await ProgressHelper.endProvisionProgress(true);
    Logger.info(Messages.EndProvision(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    return ok(undefined);
  }

  public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartDeploy(PluginInfo.DisplayName));
    await ProgressHelper.startDeployProgressHandler(ctx);

    await ProgressHelper.endDeployProgress(true);
    Logger.info(Messages.EndDeploy(PluginInfo.DisplayName));
    return ok(undefined);
  }
}
