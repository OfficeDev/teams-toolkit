// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok, Result } from "neverthrow";
import { FxError, UserCancelError } from "../error";
import { OptionItem, StaticOptions } from "../qm/question";

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
  options: StaticOptions;
  returnObject?: boolean;
}

export interface MultiSelectConfig extends UIConfig<string[]> {
  options: StaticOptions;
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

export type MultiSelectResult = InputResult<StaticOptions>;

export type InputTextResult = InputResult<string>;

export type SelectFileResult = InputResult<string>;

export type SelectFilesResult = InputResult<string[]>;

export type SelectFolderResult = InputResult<string>; 


export interface RunnableTask<T> {
  name?: string;
  current?:number;
  readonly total?:number;
  message?: string;
  run(...args: any): Promise<Result<T,FxError>>;
  cancel?(): void;
  isCanceled?: boolean;
}

export interface TaskConfig{
  cancellable?:boolean
  showProgress?:boolean,
}

export interface TaskGroupConfig{
  sequential ?: boolean,
  fastFail?: boolean
}

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
  runWithProgress<T>(task: RunnableTask<T>, config: TaskConfig, ...args:any): Promise<Result<T,FxError>>;
}

export class GroupOfTasks<T> implements RunnableTask<Result<T, FxError>[]> {
  name?:string;
  current:number = 0;
  readonly total:number;
  isCanceled = false;
  tasks: RunnableTask<T>[]; 
  config?: TaskGroupConfig;
  message?:string;
  constructor(tasks:RunnableTask<T>[], config?: TaskGroupConfig) {
    this.tasks = tasks;
    this.config = config;
    this.total = this.tasks.length;
  }
  async run(...args:any): Promise<Result<Result<T, FxError>[], FxError>> {
    if (this.tasks.length === 0) return ok([]);
    return new Promise(async (resolve) => {
      let results: Result<T, FxError>[] = [];
      const isFastFail = this.config && this.config.fastFail;
      const isSeq = this.config && this.config.sequential;
      if (isSeq) {
        this.current = 0;
        for (let i = 0; i < this.tasks.length; ++i) {
          if (this.isCanceled === true) 
          {
            resolve(err(UserCancelError));
            return ;
          }  
          const task = this.tasks[i];
          if(task.name){
            this.message = task.name;
          }
          try {
            let taskRes = await task.run(args);
            if (taskRes.isErr() && isFastFail) {
              this.isCanceled = true;
              resolve(err(taskRes.error));
              return ;
            }
            results.push(taskRes);
          } catch (e) {
            if (isFastFail) {
              this.isCanceled = true;
              resolve(err(e));
              return ;
            }
            results.push(err(e));
          } finally{
            this.current = i + 1;
          }
        }
      } else {
        let promiseResults = this.tasks.map((t) => t.run(args));
        promiseResults.forEach((p) => {
          p.then((v) => {
            this.current ++;
            if (v.isErr() && isFastFail) {
              this.isCanceled = true;
              resolve(err(v.error));
              return ;
            }
          }).catch((e) => {
            this.current ++;
            if (isFastFail) {
              this.isCanceled = true;
              resolve(err(e));
              return ;
            }
          });
        });
        results = await Promise.all(promiseResults);
      }
      resolve(ok(results));
    });
  }

  cancel() {
    for(const task of this.tasks)
      if(task.cancel)
        task.cancel();
    this.isCanceled = true;
  }
}
