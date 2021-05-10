// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  DialogMsg,
  DialogType,
  QuestionType,
  MsgLevel,
  Dialog,
  IProgressHandler,
} from "@microsoft/teamsfx-api";

export class DialogUtils {
  private static dialog: Dialog;
  public static progress: IProgressHandler;

  public static init(dialog: Dialog, title?: string, steps?: number) {
    DialogUtils.dialog = dialog;
    if (title && steps) {
      DialogUtils.progress = dialog.createProgressBar(title, steps);
    }
  }

  public static async show(message: string, level = MsgLevel.Info) {
    await DialogUtils.dialog?.communicate(
      new DialogMsg(DialogType.Show, {
        description: message,
        level,
      })
    );
  }
}
