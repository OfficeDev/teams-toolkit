// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok, Result } from "neverthrow";
import { FxError, UserCancelError } from "../error";
import { StaticOption } from "../qm/question";

export interface UIConfig {
  title: string;
  placeholder?: string;
  prompt?: string;
  step?: number;
  totalSteps?: number;
}

export interface SelectOptionConfig extends UIConfig {
  options: StaticOption;
  default?: string;
  returnObject?: boolean;
}

export interface SelectOptionsConfig extends UIConfig {
  options: StaticOption;
  default?: string[];
  returnObject?: boolean;
  onDidChangeSelection?: (
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>
  ) => Promise<Set<string>>;
  validation?: (input: string[]) => string | undefined | Promise<string | undefined>;
}

export interface TextInputConfig extends UIConfig {
  password?: boolean;
  default?: string;
  validation?: (input: string) => Promise<string | undefined>;
}

export interface SelectFileConfig extends UIConfig {
  default?: string;
  validation?: (input: string) => Promise<string | undefined>;
}

export interface SelectFolderConfig extends UIConfig {
  default?: string;
  validation?: (input: string) => Promise<string | undefined>;
}

export interface SelectFilesConfig extends UIConfig {
  validation?: (input: string[]) => Promise<string | undefined>;
}

export enum InputResultType {
  cancel = "cancel",
  back = "back",
  sucess = "sucess",
  error = "error",
  skip = "skip",
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
  run(...args: any): Promise<T>;
  cancel(): void;
}

export interface UserInterface {
  selectOption: (config: SelectOptionConfig) => Promise<InputResult>;
  selectOptions: (config: SelectOptionsConfig) => Promise<InputResult>;
  inputText: (config: TextInputConfig) => Promise<InputResult>;
  selectFile: (config: SelectFileConfig) => Promise<InputResult>;
  selectFiles: (config: SelectFilesConfig) => Promise<InputResult>;
  selectFolder: (config: SelectFolderConfig) => Promise<InputResult>;
  openUrl(link: string): Promise<boolean>;
  showMessage(
    level: MsgLevel,
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<string | undefined>;
  runWithProgress(task: TimeConsumingTask<any>): Promise<any>;
}

export class FunctionGroupTask<T> implements TimeConsumingTask<Result<Result<T, Error>[], Error>> {
  name: string;
  current = 0;
  total = 0;
  message = "";
  isCanceled = false;
  concurrent = true;
  fastFail = false;
  tasks: (() => Promise<Result<T, Error>>)[];
  constructor(
    name: string,
    tasks: (() => Promise<Result<T, Error>>)[],
    concurrent: boolean,
    fastFail: boolean
  ) {
    this.name = name;
    this.tasks = tasks;
    this.concurrent = concurrent;
    this.fastFail = fastFail;
    this.total = tasks.length;
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
    this.isCanceled = true;
  }
}
