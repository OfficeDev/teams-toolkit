// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MsgLevel, IProgressHandler, UserInteraction } from "@microsoft/teamsfx-api";

export class DialogUtils {
  private static ui?: UserInteraction;
  public static progress?: IProgressHandler;

  public static init(ui?: UserInteraction, title?: string, steps?: number) {
    DialogUtils.ui = ui;
    if (title && steps) {
      DialogUtils.progress = ui?.createProgressBar(title, steps);
    }
  }

  public static async show(message: string, level = MsgLevel.Info) {
    let l: "info" | "warn" | "error" = "info";
    if (level === MsgLevel.Warning) l = "warn";
    else if (level === MsgLevel.Error) l = "error";
    DialogUtils.ui?.showMessage(l, message, false);
  }
}
