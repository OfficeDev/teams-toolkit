// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MsgLevel, PluginContext } from "@microsoft/teamsfx-api";

export class DialogUtils {
  public static async show(
    ctx: PluginContext,
    message: string,
    level = MsgLevel.Info
  ): Promise<void> {
    let l: "info" | "warn" | "error" = "info";
    if (level === MsgLevel.Warning) l = "warn";
    else if (level === MsgLevel.Error) l = "error";
    ctx.ui?.showMessage(l, message, false);
  }
}
