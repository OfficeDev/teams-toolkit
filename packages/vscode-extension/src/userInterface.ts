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
  IProgressHandler
} from "teamsfx-api";
import { ProgressHandler } from "./progressHandler";
import { sleep } from "./utils/commonUtils";
import VsCodeLogInstance from "./commonlib/log";

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
      case DialogType.Show: {
        await this.showMessage(msg.content as IMessage);
        return new DialogMsg(DialogType.Show, {
          description: "Show Successfully",
          level: MsgLevel.Info
        });
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
          description: result ? "Output Successfully" : "Output Failed",
          level: result ? MsgLevel.Info : MsgLevel.Error
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
          description: "Show Progress Successfully",
          level: MsgLevel.Info
        });
      }
      default: {
        return new DialogMsg(DialogType.Show, {
          description: "Wrong Dialog Type",
          level: MsgLevel.Error
        });
      }
    }
  }

  public createProgressBar(title: string, totalSteps: number): IProgressHandler {
    const handler = new ProgressHandler(title, totalSteps);
    this.progressHandlers.push(handler);
    return handler;
  }

  public closeProgressHandlers() {
    this.progressHandlers.forEach(async (handler) => {
      await handler.end();
    });
  }

  /**
   * Shows message for user.
   * @param msg
   * @returns message
   */
  private async showMessage(msg: IMessage): Promise<undefined> {
    switch (msg.level) {
      case MsgLevel.Info:
        ext.ui.showInformationMessage(msg.description);
        break;
      case MsgLevel.Warning:
        ext.ui.showWarningMessage(msg.description);
        break;
      case MsgLevel.Error:
        ext.ui.showErrorMessage(msg.description);
        break;
    }
    await sleep(0);
    return undefined;
  }

  private async showProgress(prog: IProgress): Promise<Result<null, FxError>> {
    return await ext.ui.withProgress(
      {
        location: ProgressLocation.Notification,
        title: prog.title,
        cancellable: prog.cancellable
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
      case QuestionType.Radio: {
        // Show a radio for user to select one item.
        let options = question.options || [];
        if (question.defaultAnswer !== undefined) {
          options = options.filter((value: string) => value !== question.defaultAnswer);
          options.unshift(question.defaultAnswer);
        }
        if (options.length === 0) {
          return undefined;
        }
        return await ext.ui.showQuickPick(options, {
          placeHolder: question.description || "No question description",
          ignoreFocusOut: true,
          canPickMany: question.multiSelect
        });
      }
      case QuestionType.Text: {
        return await ext.ui.showInputBox({
          value: question.defaultAnswer || "",
          placeHolder: question.description || "No question description",
          ignoreFocusOut: true,
          validateInput: question.validateInput,
          password: question.password,
          prompt: question.prompt
        });
      }
      case QuestionType.SelectFolder: {
        const uri = await ext.ui.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          title: question.description
        });
        return uri && uri.length > 0 ? uri[0].fsPath : undefined;
      }
      case QuestionType.OpenFolder: {
        const uri = Uri.file(question.description);
        return await ext.ui.openFolder(uri);
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
      case QuestionType.OpenExternal: {
        const uri = Uri.parse(question.description);
        ext.ui.openExternal(uri);
        return undefined;
      }
      default: {
        await this.showMessage({
          description: "Not implement this type to asking questions.",
          level: MsgLevel.Error
        });
        return undefined;
      }
    }
  }
}

export default DialogManager.getInstance();
