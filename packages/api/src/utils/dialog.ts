// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

/**
 * @deprecated
 */
export interface Dialog {
  /**
   * @deprecated
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
export enum QuestionType {
  UpdateGlobalState = "UpdateGlobalState",
}

/**
 * @deprecated
 */
export interface IQuestion {
  type: QuestionType;
  description: string;
}

/**
 * @deprecated
 */
export interface IProgressStatus {
  message: string;
  increment?: number;
}

/**
 * @deprecated
 */
export type Answer = string | undefined;

/**
 * @deprecated
 */
export enum DialogType {
  Ask = "Ask",
  Answer = "Answer",
}

/**
 * @deprecated
 */
export class DialogMsg {
  public dialogType: DialogType;
  public content: IQuestion | Answer;

  constructor(dialogType: DialogType, content: IQuestion | Answer) {
    this.dialogType = dialogType;
    // TODO: check the dialog type.
    this.content = content;
  }
}
