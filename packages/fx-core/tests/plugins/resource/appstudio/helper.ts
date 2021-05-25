// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Dialog, DialogMsg, DialogType, IProgressHandler } from "@microsoft/teamsfx-api";

export const mockDialogProvider: Dialog = {
    async communicate(msg: DialogMsg): Promise<DialogMsg> {
      msg.dialogType = DialogType.Answer;
      msg.content = "Confirm";
      return msg;
    },
    createProgressBar(title: string, totalSteps: number): IProgressHandler {
      console.log(title + totalSteps);
      const progress: IProgressHandler = {
        async start(detail?: string): Promise<void> {
          console.log("progress start");
          console.log(detail);
        },
        async next(detail?: string): Promise<void> {
          console.log("progress");
          console.log(detail);
        },
        async end(): Promise<void> {
          console.log("progress end");
        },
      };
      return progress;
    },
};