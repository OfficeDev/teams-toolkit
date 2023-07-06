// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, UserInteraction } from "@microsoft/teamsfx-api";
import { ProgressTitleMessage, ScaffoldProgressMessage } from "./constants";

export class ProgressHelper {
  static preDeployProgress: IProgressHandler | undefined;
  static deployProgress: IProgressHandler | undefined;
  static scaffoldProgress: IProgressHandler | undefined;

  static async startScaffoldProgressHandler(
    ui: UserInteraction | undefined,
    isAdd = false
  ): Promise<IProgressHandler | undefined> {
    this.scaffoldProgress = ui?.createProgressBar(
      isAdd ? ProgressTitleMessage.AddProgressTitle : ProgressTitleMessage.ScaffoldProgressTitle,
      Object.entries(ScaffoldProgressMessage).length
    );
    await this.scaffoldProgress?.start("");
    return this.scaffoldProgress;
  }

  static async endScaffoldProgress(success: boolean): Promise<void> {
    await this.scaffoldProgress?.end(success);
    this.scaffoldProgress = undefined;
  }
}
