// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok, Result } from "neverthrow";
import { FxError, UserCancelError } from "../error";
import { OptionItem, StaticOption } from "../qm/question";

export interface UIConfig<T> {
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
  options: StaticOption;
  returnObject?: boolean;
}

export interface MultiSelectConfig extends UIConfig<string[]> {
  options: StaticOption;
  returnObject?: boolean;
  onDidChangeSelection?: (
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>
  ) => Promise<Set<string>>;
}

export interface InputTextConfig extends UIConfig<string> {
  password?: boolean;
}

export interface SelectFileConfig extends UIConfig<string> {
};

export interface SelectFilesConfig extends UIConfig<string[]> {
};

export interface SelectFolderConfig extends UIConfig<string> {
};

export interface InputResult<T> {
  type: "success" | "skip" | "back";
  result?: T;
}

export type SingleSelectResult = InputResult<string | OptionItem>;

export type MultiSelectResult = InputResult<StaticOption>;

export type InputTextResult = InputResult<string>;

export type SelectFileResult = InputResult<string>;

export type SelectFilesResult = InputResult<string[]>;

export type SelectFolderResult = InputResult<string>; 


export interface TimeConsumingTask<T> {
  name: string;
  /**
   * whether ui support cancel or not
   */
  cancelable:boolean;
  current:number;
  total:number;
  showProgress:boolean;
  message: string;
  isFinished: boolean;
  isCanceled: boolean;
  run(...args: any): Promise<T>;
  cancel(): void;
}

/// TODO: use Result<xxx, FxError> instead of SingleSelectResult/MultiSelectResult/xxx
export interface UserInteraction {
  selectOption: (config: SingleSelectConfig) => Promise<Result<SingleSelectResult,FxError>>;
  selectOptions: (config: MultiSelectConfig) => Promise<Result<MultiSelectResult,FxError>>;
  inputText: (config: InputTextConfig) => Promise<Result<InputTextResult,FxError>>;
  selectFile: (config: SelectFileConfig) => Promise<Result<SelectFileResult,FxError>>;
  selectFiles: (config: SelectFilesConfig) => Promise<Result<SelectFilesResult,FxError>>;
  selectFolder: (config: SelectFolderConfig) => Promise<Result<SelectFolderResult,FxError>>;
  
  openUrl(link: string): Promise<Result<boolean,FxError>>;
  showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string|undefined,FxError>>;
  runWithProgress(task: TimeConsumingTask<any>): Promise<Result<any,FxError>>;
}

export interface FunctionGroupTaskConfig<T>{
  name: string,
  tasks: (() => Promise<Result<T, FxError>>)[],
  taskNames?: string[];
  showProgress: boolean;
  cancelable: boolean,
  concurrent?: boolean,
  fastFail?: boolean
}

export class TaskGroup<T> implements TimeConsumingTask<Result<Result<T, FxError>[], FxError>> {
  name: string;
  current:number = 0;
  total:number;
  message = "";
  isCanceled = false;
  isFinished = false;
  cancelable = true;
  concurrent?;
  fastFail?;
  tasks: (() => Promise<Result<T, FxError>>)[];
  taskNames?: string[];
  showProgress:boolean;
  constructor(config: FunctionGroupTaskConfig<T>) {
    this.name = config.name;
    this.tasks = config.tasks;
    this.taskNames = config.taskNames;
    this.cancelable = config.cancelable;
    this.concurrent = config.concurrent;
    this.fastFail = config.fastFail;
    this.showProgress = config.showProgress;
    this.total = this.tasks.length;
  }
  async run(): Promise<Result<Result<T, FxError>[], FxError>> {
    if (this.tasks.length === 0) return ok([]);
    return new Promise(async (resolve) => {
      let results: Result<T, FxError>[] = [];
      if (!this.concurrent) {
        for (let i = 0; i < this.tasks.length; ++i) {
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
          } finally{
            this.current = i + 1;
          }
        }
        this.isFinished = true;
      } else {
        let promiseResults = this.tasks.map((t) => t());
        let finishNum = 0;
        promiseResults.forEach((p) => {
          p.then((v) => {
            finishNum ++;
            if(this.showProgress)
              this.current = finishNum;
            if (v.isErr() && this.fastFail) {
              this.isCanceled = true;
              resolve(err(v.error));
            }
          }).catch((e) => {
            finishNum ++;
            if(this.showProgress)
              this.current = finishNum;
            if (this.fastFail) {
              this.isCanceled = true;
              resolve(err(e));
            }
          });
        });
        results = await Promise.all(promiseResults);
        this.isFinished = true;
      }
      resolve(ok(results));
    });
  }

  cancel() {
    if(this.cancelable)
      this.isCanceled = true;
  }
}
