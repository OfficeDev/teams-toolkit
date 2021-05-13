// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { DialogMsg, DialogType, MsgLevel, PluginContext } from "@microsoft/teamsfx-api";

export class DialogUtils {
  public static async show(
    ctx: PluginContext,
    message: string,
    level = MsgLevel.Info
  ): Promise<void> {
    const content: DialogMsg = new DialogMsg(DialogType.Show, {
      description: message,
      level: level,
    });
    await ctx.dialog?.communicate(content);
  }
}
