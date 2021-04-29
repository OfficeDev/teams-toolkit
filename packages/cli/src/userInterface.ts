// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import open from "open";

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
  ConfigMap
} from "fx-api";
import inquirer from "inquirer";
import CLILogProvider from "./commonlib/log";
import { ProgressHandler } from "./progressHandler";
import { NotSupportedQuestionType } from "./error";

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
        this.showMessage(msg.content as IMessage);
        return new DialogMsg(DialogType.Show, {
          description: "Show successfully",
          level: MsgLevel.Info
        });
      }
      case DialogType.Output: {
        this.showMessage(msg.content as IMessage);
        return new DialogMsg(DialogType.Show, {
          description: "Output successfully",
          level: MsgLevel.Info
        });
      }
      case DialogType.ShowProgress: {
        const result = await this.showProgress(msg.content as IProgress);
        if (result.isErr()) {
          return new DialogMsg(DialogType.Show, {
            description: result.error.source,
            level: MsgLevel.Error
          });
        }
        return new DialogMsg(DialogType.Show, {
          description: "Show Progress Successfully!",
          level: MsgLevel.Info
        });
      }
      default: {
        return new DialogMsg(DialogType.Show, {
          description: "Wrong dialog Type",
          level: MsgLevel.Error
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
    if (question.description.includes("subscription")) {
      CLILogProvider.error(
        `Azure subscription required. Use 'teamsfx account set --subscription <SUBSCRIPTION>' to select your Azure subscription.`
      );
      return undefined;
    }
    switch (question.type) {
      case QuestionType.Confirm:
        if (question.options && question.options.length === 1) {
          const answers = await inquirer.prompt([{
            name: QuestionType.Confirm,
            type: "confirm",
            message: question.description,
          }]);
          const confirmOption = question.options[0];
          if (answers[QuestionType.Confirm]) {
            return confirmOption;
          }
          else {
            return undefined;
          }
        }
        break;
      case QuestionType.OpenExternal:
        open(question.description);
        return undefined;
      case QuestionType.OpenFolder:
        return undefined;
      /// TODO: remove this part of hard code
      case QuestionType.Text:
        break;
    }
    const err = NotSupportedQuestionType(question);
    CLILogProvider.error(
      `code:${err.source}.${err.name}, message: ${err.message}, stack: ${err.stack}`
    );
    return undefined;
  }

  private showMessage(msg: IMessage) {
    switch (msg.level) {
      case MsgLevel.Info:
        CLILogProvider.info(msg.description);
        break;
      case MsgLevel.Warning:
        CLILogProvider.warning(msg.description);
        break;
      case MsgLevel.Error:
        CLILogProvider.error(msg.description);
        break;
    }
    return;
  }
}

export default DialogManager.getInstance();
