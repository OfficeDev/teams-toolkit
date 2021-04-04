// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError } from "../error";
import { AnswerValue, OptionItem, StaticOption } from "./question";

 

export interface FxQuickPickOption {
  title: string;
  items: StaticOption;
  canSelectMany: boolean;
  defaultValue?: string | string[];
  placeholder?: string;
  backButton?: boolean;
  returnObject?: boolean;
  onDidChangeSelection?: (items: OptionItem[]) => Promise<string[]>;
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

    validation?: (input: string | string[]) => Promise<string | undefined | null>;
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


   
