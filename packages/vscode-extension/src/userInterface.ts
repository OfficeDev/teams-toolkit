/* eslint-disable @typescript-eslint/no-empty-function */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ext } from "./extensionVariables";
import { Uri, window, Terminal, ProgressLocation } from "vscode";
import {
  IMessage,
  MsgLevel,
  IQuestion,
  QuestionType,
  Answer,
  DialogMsg,
  DialogType,
  Dialog,
  IProgress,
  IProgressStatus,
  Result,
  FxError,
  IProgressHandler,
} from "@microsoft/teamsfx-api";
import { ProgressHandler } from "./progressHandler";
import { sleep } from "./utils/commonUtils";
import VsCodeLogInstance from "./commonlib/log";
import * as StringResources from "./resources/Strings.json";

export class DialogManager implements Dialog {
  private static instance: DialogManager;
  private progressHandlers: ProgressHandler[] = [];

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
      case DialogType.Output: {
        let result: boolean;
        switch ((msg.content as IMessage).level) {
          case MsgLevel.Info:
            result = await VsCodeLogInstance.info((msg.content as IMessage).description);
            break;
          case MsgLevel.Warning:
            result = await VsCodeLogInstance.warning((msg.content as IMessage).description);
            break;
          case MsgLevel.Error:
            result = await VsCodeLogInstance.error((msg.content as IMessage).description);
            break;
        }
        return new DialogMsg(DialogType.Show, {
          description: "",
          level: result ? MsgLevel.Info : MsgLevel.Error,
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
          description: "",
          level: MsgLevel.Info,
        });
      }
      default: {
        return new DialogMsg(DialogType.Show, {
          description: "",
          level: MsgLevel.Error,
        });
      }
    }
  }

  /**
   * Shows message for user.
   * @param msg
   * @returns message
   */
  private async showMessage(msg: IMessage): Promise<string | undefined> {
    let result = undefined;
    switch (msg.level) {
      case MsgLevel.Info:
        result = ext.ui.showInformationMessage(
          msg.description,
          msg.modal,
          ...(msg.items ? msg.items : [])
        );
        break;
      case MsgLevel.Warning:
        result = ext.ui.showWarningMessage(
          msg.description,
          msg.modal,
          ...(msg.items ? msg.items : [])
        );
        break;
      case MsgLevel.Error:
        result = ext.ui.showErrorMessage(
          msg.description,
          msg.modal,
          ...(msg.items ? msg.items : [])
        );
        break;
    }
    await sleep(0);
    if (msg.items) {
      return result;
    } else {
      return Promise.resolve(StringResources.vsc.userInterface.showSuccessfully);
    }
  }

  private async showProgress(prog: IProgress): Promise<Result<null, FxError>> {
    return await ext.ui.withProgress(
      {
        location: ProgressLocation.Notification,
        title: prog.title,
        cancellable: prog.cancellable,
      },
      async (progress) => {
        await sleep(0);
        let currentStatus: IteratorResult<
          IProgressStatus,
          Result<null, FxError>
        > = await prog.progressIter.next();
        while (!currentStatus.done) {
          progress.report(currentStatus.value);
          await sleep(0);
          currentStatus = await prog.progressIter.next();
        }
        return currentStatus.value;
      }
    );
  }

  /**
   * Extension asks user a question and return the user's answer.
   * @param question
   * @returns the user's answer.
   */
  private async askQuestion(question: IQuestion): Promise<Answer> {
    switch (question.type) {
      case QuestionType.OpenFolder: {
        const uri = Uri.file(question.description);
        return await ext.ui.openFolder(uri);
      }
      case QuestionType.UpdateGlobalState: {
        await ext.context.globalState.update(question.description, true);
        return undefined;
      }
      case QuestionType.ExecuteCmd: {
        const terminalName: string = question.terminalName || "undefined";
        const terminals: Terminal[] = window.terminals.filter(
          (terminal) => terminal.name === terminalName
        );
        const terminal: Terminal =
          terminals.length > 0 ? terminals[0] : window.createTerminal(terminalName);
        terminal.sendText(question.description || "");
        terminal.show();
        return undefined;
      }

      default: {
        await this.showMessage({
          description: StringResources.vsc.userInterface.notImplementQuestion,
          level: MsgLevel.Error,
        });
        return undefined;
      }
    }
  }
}

export default DialogManager.getInstance();
