// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { normalizeMessage } from "../resources/message";

enum MsgLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

export class DialogUtils {
  public static async show(
    ctx: PluginContext,
    message: string,
    level = MsgLevel.Info
  ): Promise<void> {
    await ctx.ui?.showMessage(level, normalizeMessage(message), false);
  }
}
