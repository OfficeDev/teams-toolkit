// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MsgLevel, PluginContext } from "@microsoft/teamsfx-api";

export class DialogUtils {
  public static async showAndHelp(
    ctx: PluginContext,
    message: string,
    link: string,
    level = MsgLevel.Info
  ): Promise<void> {
    const helpLabel = "Get Help";
    const res = await ctx.ui?.showMessage("info", message, true, helpLabel);
    const answer = res?.isOk() ? res.value : undefined;
    if (answer === helpLabel) {
      ctx.ui?.openUrl(link);
    }
  }
}
