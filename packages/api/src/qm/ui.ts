// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError } from "../error";
import { AnswerValue, OptionItem, StaticOption } from "./question";

 

export interface FxQuickPickOption {
  /**
   * title text of the QuickPick
   */
  title: string;
  /**
   * select option list
   */
  items: StaticOption;
  /**
   * whether is multiple select or single select
   */
  canSelectMany: boolean;
  /**
   * The default selected `id` (for single select) or `id` array (for multiple select)
   */
  defaultValue?: string | string[];

  /**
   * placeholder text
   */
  placeholder?: string;

  /**
   * whether enable `go back` button
   */
  backButton?: boolean;

  /**
   * whether the answer return the original `OptionItem` object array.
   * if true: the answer is the original `OptionItem` object array; 
   * if false: the answer is the `id` array of the `OptionItem`
   * The default value is false
   */
  returnObject?: boolean;

  /**
   * a callback function when the select changes
   * @items: current selected `OptionItem` array
   * @returns: the new selected `id` array
   */
  onDidChangeSelection?: (currentSelectedItems: OptionItem[], previousSelectedItems: OptionItem[]) => Promise<string[]>;
}

export interface FxInputBoxOption {
  title: string;
  password: boolean;
  defaultValue?: string;
  placeholder?: string;
  prompt?: string;
  validation?: (input: string) => Promise<string | undefined>;
  backButton?: boolean;
  number?:boolean;
}

export interface FxOpenDialogOption{
    /**
     * The resource the dialog shows when opened.
     */
    defaultUri?: string;

    /**
     * A human-readable string for the open button.
     */
    openLabel?: string;

    /**
     * Allow to select files, defaults to `true`.
     */
    canSelectFiles?: boolean;

    /**
     * Allow to select folders, defaults to `false`.
     */
    canSelectFolders?: boolean;

    /**
     * Allow to select many files or folders.
     */
    canSelectMany?: boolean;

    /**
     * A set of file filters that are used by the dialog. Each entry is a human-readable label,
     * like "TypeScript", and an array of extensions, e.g.
     * ```ts
     * {
     *     'Images': ['png', 'jpg']
     *     'TypeScript': ['ts', 'tsx']
     * }
     * ```
     */
    filters?: { [name: string]: string[] };

    /**
     * Dialog title.
     *
     * This parameter might be ignored, as not all operating systems display a title on open dialogs
     * (for example, macOS).
     */
    title?: string;

    validation?: (input: string) => Promise<string | undefined>;
}

export enum InputResultType {
  cancel = "cancel",
  back = "back",
  sucess = "sucess",
  error = "error",
  pass = "pass" // for single select option quick pass it
}

export interface InputResult {
  type: InputResultType;
  result?: AnswerValue;
  error?: FxError;
}

export interface UserInterface{
  showQuickPick: (option: FxQuickPickOption) => Promise<InputResult> 
  showInputBox: (option: FxInputBoxOption) => Promise<InputResult>;
  showOpenDialog: (option: FxOpenDialogOption) => Promise<InputResult>;
}


   
