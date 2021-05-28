// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  IMessage,
  MsgLevel,
  IQuestion,
  QuestionType,
  DialogMsg,
  DialogType,
  Dialog,
  IProgress,
  Result,
  FxError,
  IProgressStatus,
  IProgressHandler,
  ConfigMap,
  LogLevel,
} from "@microsoft/teamsfx-api";

import CLILogProvider from "./commonlib/log";
import { ProgressHandler } from "./progressHandler";
import { NotSupportedQuestionType } from "./error";
import CLIUIInstance from "./userInteraction";

export class DialogManager implements Dialog {
  private static instance: DialogManager;

  public static answers: ConfigMap;

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
   * CLI does the right thing according to the dialog message's type and return a dialog message.
   * // TODO: this may change to an error handling.
   * @param msg
   * @returns dialog msg
   */
  public async communicate(msg: DialogMsg): Promise<DialogMsg> {
    switch (msg.dialogType) {
      case DialogType.Ask: {
        const answer: string | undefined = await this.askQuestion(msg.content as IQuestion);
        return new DialogMsg(DialogType.Answer, answer);
      }
      case DialogType.Show: {
        const result = await this.showMessage(msg.content as IMessage);
        return new DialogMsg(DialogType.Answer, result);
      }
      case DialogType.Output: {
        this.showMessage(msg.content as IMessage);
        return new DialogMsg(DialogType.Show, {
          description: "Output successfully",
          level: MsgLevel.Info,
        });
      }
      case DialogType.ShowProgress: {
        const result = await this.showProgress(msg.content as IProgress);
        if (result.isErr()) {
          return new DialogMsg(DialogType.Show, {
            description: result.error.source,
            level: MsgLevel.Error,
          });
        }
        return new DialogMsg(DialogType.Show, {
          description: "Show Progress Successfully!",
          level: MsgLevel.Info,
        });
      }
      default: {
        return new DialogMsg(DialogType.Show, {
          description: "Wrong dialog Type",
          level: MsgLevel.Error,
        });
      }
    }
  }

  public createProgressBar(title: string, totalSteps: number): IProgressHandler {
    const handler = new ProgressHandler(title, totalSteps);
    return handler;
  }

  public presetAnswers(answers: ConfigMap) {
    DialogManager.answers = answers;
  }

  private async showProgress(prog: IProgress): Promise<Result<null, FxError>> {
    let currentStatus: IteratorResult<
      IProgressStatus,
      Result<null, FxError>
    > = await prog.progressIter.next();
    while (!currentStatus.done) {
      currentStatus = await prog.progressIter.next();
    }
    return currentStatus.value;
  }

  private async askQuestion(question: IQuestion): Promise<string | undefined> {
    switch (question.type) {
      case QuestionType.Confirm: {
        if (!question.options || question.options.length === 0) {
          break;
        }
        const result = await CLIUIInstance.showMessage(
          "info",
          question.description,
          true,
          ...question.options
        );
        if (result.isOk()) {
          return result.value;
        } else {
          return undefined;
        }
      }
      case QuestionType.OpenExternal: {
        await CLIUIInstance.openUrl(
          question.description
        );
        return undefined;
      }
      case QuestionType.OpenFolder:
        return undefined;
      /// TODO: remove this part of hard code
      case QuestionType.Text:
        break;
    }
    throw NotSupportedQuestionType(question);
  }

  private async showMessage(msg: IMessage): Promise<string | undefined> {
    let level: "info" | "warn" | "error";
    switch (msg.level) {
      case MsgLevel.Info:
        level = "info";
        break;
      case MsgLevel.Warning:
        level = "warn";
        break;
      case MsgLevel.Error:
        level = "error";
        break;
    }
    const result = await CLIUIInstance.showMessage(
      level,
      msg.description,
      !!msg.modal,
      ...(msg.items || [])
    );
    if (result.isOk()) {
      return result.value;
    } else {
      return undefined;
    }
  }
}

export default DialogManager.getInstance();
