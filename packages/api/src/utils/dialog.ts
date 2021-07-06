// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Result } from "neverthrow";
import { FxError } from "../error";

/**
 * @deprecated
 */
export interface Dialog {
  /**
   * Platforms (such as VSCode, CLI) support this function to communicate with core.
   * There are 3 dialog types.
   *   1. Ask: core can ask platform for questions and platform will render UI for users to collect data.
   *      The return type is Answer.
   *   2. Show: core can let platform show some messages to users.
   *
   * Example 1 (ask for appType):
   *     await communicate(new DialogMsg(
   *          DialogType.Ask,
   *          {
   *              type: QuestionType.Radio,
   *              description: "Which type of Teams App do you want to develop?",
   *              defaultAnswer: "tab",
   *              options: ["tab", "bot", "message"],
   *          }
   *     ))
   *
   * Example 2 (show something):
   *     await communicate(new DialogMsg(
   *          DialogType.Show,
   *          {
   *              description: "Scaffold successfully!",
   *              level: MsgLevel.Info,
   *          }
   *     ))
   */
  communicate: (msg: DialogMsg) => Promise<DialogMsg>;
}

/**
 * @deprecated
 */
export enum MsgLevel {
  Info = "Info",
  Warning = "Warning",
  Error = "Error",
}

/**
 * @deprecated
 */
export interface IMessage {
  description: string;
  level: MsgLevel;
  items?: string[];
  modal?: boolean;
}

/**
 * @deprecated
 */
export enum QuestionType {
  OpenFolder = "OpenFolder",
  ExecuteCmd = "ExecuteCmd",
  UpdateGlobalState = "UpdateGlobalState",
}

/**
 * @deprecated
 */
export interface IQuestion {
  type: QuestionType;
  description: string;
  defaultAnswer?: string;
  options?: string[];
  terminalName?: string; // for 'ExecuteCmd', specify the terminal name or undefined.
  validateInput?: (value: string) => string | undefined | null | Promise<string | undefined | null>;
  multiSelect?: boolean;
  password?: boolean;
  prompt?: string;
}

/**
 * @deprecated
 */
export interface IProgressStatus {
  message: string;
  increment?: number;
}

/**
 * Iprogress status
 * @deprecated
 */
export interface IProgress {
  title?: string; // A human-readable string which will be used to describe the
  cancellable?: boolean; // Controls if a cancel button should show to allow the user to cancel the long running operation
  progressIter: AsyncGenerator<IProgressStatus, Result<null, FxError>>; // An iterator of progress status
}

/**
 * @deprecated
 */
export type Answer = string | undefined;

/**
 * @deprecated
 */
export enum DialogType {
  Show = "Show",
  ShowProgress = "ShowProgress",
  Ask = "Ask",
  Answer = "Answer",
  Output = "Output",
}

/**
 * @deprecated
 */
export class DialogMsg {
  public dialogType: DialogType;
  public content: IMessage | IQuestion | IProgress | Answer;

  constructor(dialogType: DialogType, content: IMessage | IQuestion | IProgress | Answer) {
    this.dialogType = dialogType;
    // TODO: check the dialog type.
    this.content = content;
  }

  public getAnswer(): Answer | undefined {
    if (this.dialogType === DialogType.Answer && this.content !== undefined) {
      return this.content as Answer;
    }
    return undefined;
  }
}
