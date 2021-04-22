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
  IProgressHandler
} from "fx-api";
import { ProgressHandler } from "./progressHandler";
import { isWindows, sleep } from "./utils/commonUtils";
import VsCodeLogInstance from "./commonlib/log";
import * as StringResources from "./resources/Strings.json";
import { WindowContext } from "@fluentui/react-window-provider";

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
        return new Promise(async (resolve, reject) => {
          const result = await this.showMessage(msg.content as IMessage);
          resolve(new DialogMsg(DialogType.Answer, result));
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
          description: "",
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
          description: "",
          level: MsgLevel.Info
        });
      }
      default: {
        return new DialogMsg(DialogType.Show, {
          description: "",
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
  private async showMessage(msg: IMessage): Promise<string | undefined> {
    let result = undefined;
    switch (msg.level) {
      case MsgLevel.Info:
        result = ext.ui.showInformationMessage(msg.description, ...(msg.items ? msg.items : []));
        break;
      case MsgLevel.Warning:
        result = ext.ui.showWarningMessage(msg.description, ...(msg.items ? msg.items : []));
        break;
      case MsgLevel.Error:
        result = ext.ui.showErrorMessage(msg.description, ...(msg.items ? msg.items : []));
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
          placeHolder: question.description || StringResources.vsc.userInterface.noQuestionDescription,
          ignoreFocusOut: true,
          canPickMany: question.multiSelect
        });
      }
      case QuestionType.Text: {
        return await ext.ui.showInputBox({
          value: question.defaultAnswer || "",
          placeHolder: question.description || StringResources.vsc.userInterface.noQuestionDescription,
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
          terminals.length > 0 ? terminals[0] : window.createTerminal({name:terminalName,cwd:question.terminalPath});
        terminal.sendText((question.description || "") + " ; exit");
        terminal.show();
        while(!terminal.exitStatus){
          await sleep(1000);
        }
        return undefined;
      }
      case QuestionType.OpenExternal: {
        const uri = Uri.parse(question.description);
        ext.ui.openExternal(uri);
        return undefined;
      }
      default: {
        await this.showMessage({
          description: StringResources.vsc.userInterface.notImplementQuestion,
          level: MsgLevel.Error
        });
        return undefined;
      }
    }
  }
}

export default DialogManager.getInstance();
