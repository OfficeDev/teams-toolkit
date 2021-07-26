/* eslint-disable @typescript-eslint/no-empty-function */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  IQuestion,
  QuestionType,
  Answer,
  DialogMsg,
  DialogType,
  Dialog,
} from "@microsoft/teamsfx-api";
import { globalStateUpdate } from "@microsoft/teamsfx-core";
import { ProgressHandler } from "./progressHandler";

export class DialogManager implements Dialog {
  private static instance: DialogManager;

  /**
   * It can be only called by inner function.
   */
  private constructor() {}

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): DialogManager {
    if (!DialogManager.instance) {
      DialogManager.instance = new DialogManager();
    }

    return DialogManager.instance;
  }

  /**
   * Extension does the right thing according to the dialog message's type and return a dialog message.
   * // TODO: this may change to an error handling.
   * @param msg
   * @returns dialog msg
   */
  public async communicate(msg: DialogMsg): Promise<DialogMsg> {
    switch (msg.dialogType) {
      case DialogType.Ask: {
        return new DialogMsg(DialogType.Answer, await this.askQuestion(msg.content as IQuestion));
      }
      default: {
        return new DialogMsg(DialogType.Answer, undefined);
      }
    }
  }

  /**
   * Extension asks user a question and return the user's answer.
   * @param question
   * @returns the user's answer.
   */
  private async askQuestion(question: IQuestion): Promise<Answer> {
    switch (question.type) {
      case QuestionType.UpdateGlobalState:
        await globalStateUpdate(question.description, true);
        return undefined;
      default:
        return undefined;
    }
  }
}

export default DialogManager.getInstance();
