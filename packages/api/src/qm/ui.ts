// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok, Result } from "neverthrow";
import { FxError, UserCancelError } from "../error";
import { OptionItem, StaticOptions } from "../qm/question";

export interface UIConfig<T> {
  type: "radio" | "multibox" | "text" | "file" | "files" | "folder";
  name: string;
  title: string;
  placeholder?: string;
  prompt?: string;
  step?: number;
  totalSteps?: number;
  default?: T;
  validation?: (input: T) => string | undefined | Promise<string | undefined>;
}

export interface SingleSelectConfig extends UIConfig<string> {
  type: "radio";
  options: StaticOptions;
  returnObject?: boolean;
}

export interface MultiSelectConfig extends UIConfig<string[]> {
  type: "multibox";
  options: StaticOptions;
  returnObject?: boolean;
  onDidChangeSelection?: (
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>
  ) => Promise<Set<string>>;
}

export interface InputTextConfig extends UIConfig<string> {
  type: "text";
  password?: boolean;
}

export interface SelectFileConfig extends UIConfig<string> {
  type: "file";
};

export interface SelectFilesConfig extends UIConfig<string[]> {
  type: "files";
};

export interface SelectFolderConfig extends UIConfig<string> {
  type: "folder";
};

export interface InputResult<T> {
  type: "success" | "skip" | "cancel" | "back" | "error";
  result?: T;
  error?: FxError;
}

export type SingleSelectResult = InputResult<string | OptionItem>;

export type MultiSelectResult = InputResult<StaticOptions>;

export type InputTextResult = InputResult<string>;

export type SelectFileResult = InputResult<string>;

export type SelectFilesResult = InputResult<string[]>;

export type SelectFolderResult = InputResult<string>;

export type OpenUrlResult = InputResult<string>;

export type ShowMessageResult = InputResult<string>;

export type RunWithProgressResult = InputResult<any>;


export interface TimeConsumingTask<T> {
  name: string;
  cancelable:boolean;
  total: number;
  current: number;
  message: string;
  isCanceled: boolean;
  run(...args: any): Promise<T>;
  cancel(): void;
}

/// TODO: use Result<xxx, FxError> instead of SingleSelectResult/MultiSelectResult/xxx
export interface UserInteraction {
  selectOption: (config: SingleSelectConfig) => Promise<SingleSelectResult>;
  selectOptions: (config: MultiSelectConfig) => Promise<MultiSelectResult>;
  inputText: (config: InputTextConfig) => Promise<InputTextResult>;
  selectFile: (config: SelectFileConfig) => Promise<SelectFileResult>;
  selectFiles: (config: SelectFilesConfig) => Promise<SelectFilesResult>;
  selectFolder: (config: SelectFolderConfig) => Promise<SelectFolderResult>;
  openUrl(link: string): Promise<OpenUrlResult>;
  showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<ShowMessageResult>;
  runWithProgress(task: TimeConsumingTask<any>): Promise<RunWithProgressResult>;
}

export interface FunctionGroupTaskConfig<T>{
  name: string,
  tasks: (() => Promise<Result<T, Error>>)[],
  taskNames?: string[];
  cancelable: boolean,
  concurrent: boolean,
  fastFail: boolean
}

export class FunctionGroupTask<T> implements TimeConsumingTask<Result<Result<T, Error>[], Error>> {
  name: string;
  current = 0;
  total = 0;
  message = "";
  isCanceled = false;
  concurrent = true;
  cancelable = true;
  fastFail = false;
  tasks: (() => Promise<Result<T, Error>>)[];
  taskNames?: string[];
  constructor(config: FunctionGroupTaskConfig<T>) {
    this.name = config.name;
    this.tasks = config.tasks;
    this.taskNames = config.taskNames;
    this.cancelable = config.cancelable;
    this.concurrent = config.concurrent;
    this.fastFail = config.fastFail;
    this.total = this.tasks.length;
  }
  async run(): Promise<Result<Result<T, Error>[], Error>> {
    if (this.total === 0) return ok([]);
    return new Promise(async (resolve) => {
      let results: Result<T, Error>[] = [];
      if (!this.concurrent) {
        for (let i = 0; i < this.total; ++i) {
          if (this.isCanceled === true) 
          {
            resolve(err(UserCancelError));
            return ;
          }  
          const task = this.tasks[i];
          if(this.taskNames){
            this.message = this.taskNames[i];
          }
          try {
            let taskRes = await task();
            if (taskRes.isErr() && this.fastFail) {
              this.isCanceled = true;
              resolve(err(taskRes.error));
              return ;
            }
            results.push(taskRes);
          } catch (e) {
            if (this.fastFail) {
              this.isCanceled = true;
              resolve(err(e));
              return ;
            }
            results.push(err(e));
          }
          this.current = i + 1;
        }
      } else {
        let promiseResults = this.tasks.map((t) => t());
        promiseResults.forEach((p) => {
          p.then((v) => {
            this.current++;
            if (v.isErr() && this.fastFail) {
              this.isCanceled = true;
              resolve(err(v.error));
            }
          }).catch((e) => {
            this.current++;
            if (this.fastFail) {
              this.isCanceled = true;
              resolve(err(e));
            }
          });
        });
        results = await Promise.all(promiseResults);
      }
      resolve(ok(results));
    });
  }

  cancel() {
    if(this.cancelable)
      this.isCanceled = true;
  }
}
