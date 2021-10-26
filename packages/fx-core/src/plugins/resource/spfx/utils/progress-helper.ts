// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, PluginContext } from "@microsoft/teamsfx-api";
import { ProgressTitleMessage, PreDeployProgressMessage } from "./constants";

export class ProgressHelper {
  static preDeployProgress: IProgressHandler | undefined;
  static deployProgress: IProgressHandler | undefined;

  static async startPreDeployProgressHandler(
    ctx: PluginContext
  ): Promise<IProgressHandler | undefined> {
    this.preDeployProgress = ctx.ui?.createProgressBar(
      ProgressTitleMessage.PreDeployProgressTitle,
      Object.entries(PreDeployProgressMessage).length
    );
    await this.preDeployProgress?.start("");
    return this.preDeployProgress;
  }

  static async endAllHandlers(success: boolean): Promise<void> {
    await this.endPreDeployProgress(success);
  }

  static async endPreDeployProgress(success: boolean): Promise<void> {
    await this.preDeployProgress?.end(success);
    this.preDeployProgress = undefined;
  }

  static async startDeployProgressHandler(
    ctx: PluginContext
  ): Promise<IProgressHandler | undefined> {
    this.deployProgress = ctx.ui?.createProgressBar(ProgressTitleMessage.DeployProgressTitle, 1);
    await this.deployProgress?.start("");
    return this.deployProgress;
  }

  static async endDeployProgress(success: boolean): Promise<void> {
    await this.deployProgress?.end(success);
    this.deployProgress = undefined;
  }
}
