// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";

enum MsgLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

export class DialogUtils {
  private static ctx: PluginContext | undefined;
  public static setContext(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  public static async show(message: string, level = MsgLevel.Info): Promise<void> {
    await this.ctx?.ui?.showMessage(level, message, false);
  }
}
