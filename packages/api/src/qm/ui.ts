// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { OptionItem, StaticOption } from "../qm/question";


export interface UIConfig{
  title: string,
  placeholder?: string;
  prompt?:string;
  step?: number;
  totalSteps?: number;
}

export interface SelectOptionConfig extends UIConfig{
  options: StaticOption;
  default?: string;
  returnObject?: boolean;
}

export interface SelectOptionsConfig extends UIConfig{
  options: StaticOption;
  default?: string[];
  returnObject?: boolean;
  onDidChangeSelection?: (currentSelectedIds: Set<string>, previousSelectedIds: Set<string>) => Promise<Set<string>>;
  validation?: (input: string[]) => string|undefined|Promise<string|undefined>;
}

export interface TextInputConfig extends UIConfig{
  password?: boolean;
  default?: string;
  validation?: (input: string) => Promise<string | undefined>;
}

export interface SelectFileConfig extends UIConfig{
  default?: string;
  validation?: (input: string) => Promise<string | undefined>;
}

export interface SelectFolderConfig extends UIConfig{
  default?: string;
  validation?: (input: string) => Promise<string | undefined>;
}

export interface SelectFilesConfig extends UIConfig{
  validation?: (input: string[]) => Promise<string | undefined>;
}


export enum InputResultType {
  cancel = "cancel",
  back = "back",
  sucess = "sucess",
  error = "error",
  skip = "skip"
}

export interface InputResult {
  type: InputResultType;
  result?: unknown;
  error?: FxError;
}

export enum MsgLevel {
  Info = "Info",
  Warning = "Warning",
  Error = "Error",
}

export interface TimeConsumingTask<T> {
  name: string;
  total: number;
  current: number;
  message: string;
  isCanceled: boolean;
  run(): Promise<Result<T, FxError>>;
  cancel(): void;
}

export interface UserInterface {
  selectOption: (config: SelectOptionConfig) => Promise<InputResult>
  selectOptions: (config: SelectOptionsConfig) => Promise<InputResult>
  inputText: (config: TextInputConfig) => Promise<InputResult>;
  selectFile: (config: SelectFileConfig) => Promise<InputResult>;
  selectFiles: (config: SelectFilesConfig) => Promise<InputResult>;
  selectFolder: (config: SelectFolderConfig) => Promise<InputResult>;
  openUrl(link: string): Promise<boolean>;
  showMessage(level: MsgLevel, message: string, modal: boolean, ...items: string[]): Promise<string | undefined>;
  runWithProgress<T>(task: TimeConsumingTask<T>): Promise<Result<T, FxError>>;
}