// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok, Result } from "neverthrow";
import { FxError, UserCancelError } from "../error";
import { OptionItem, StaticOptions } from "../qm/question";
import { Colors } from "./../utils/log";

/**
 * A base structure of user interaction (UI) configuration
 */
export interface UIConfig<T> {
  /**
   * name is the identifier of the UI
   */
  name: string;
  /**
   * human readable meaningful display name of the UI
   */
  title: string;
  /**
   * placeholder in the UI
   */
  placeholder?: string;
  /**
   * prompt text providing some ask or explanation to the user
   */
  prompt?: string;
  /**
   * `step` and `totalSteps` are used to discribe the progress in question flow
   * `step` is the sequence number of current question
   */
  step?: number;
  /**
   * `totalStep` is the number of questions totally
   */
  totalSteps?: number;
  /**
   * default input value
   */
  default?: T;

  /**
   * A function that will be called to validate input and to give a hint to the user.
   *
   * @param input The current value of the input to be validated.
   * @return A human-readable string which is presented as diagnostic message.
   * Return `undefined` when 'value' is valid.
   */
  validation?: (input: T) => string | undefined | Promise<string | undefined>;
}

/**
 * single selection UI config
 */
export interface SingleSelectConfig extends UIConfig<string> {
  /**
   * option array
   */
  options: StaticOptions;
  /**
   * This config only works for option items with `OptionItem[]` type. If `returnObject` is true, the answer value is an `OptionItem` object; otherwise, the answer value is the `id` string of the `OptionItem`.
   * In case of option items with `string[]` type, whether `returnObject` is true or false, the returned answer value is always a string.
   */
  returnObject?: boolean;
}

/**
 * multiple selection UI config
 */
export interface MultiSelectConfig extends UIConfig<string[]> {
  /**
   * option array
   */
  options: StaticOptions;
  /**
   * This config only works for option items with `OptionItem[]` type. If `returnObject` is true, the answer value is an array of `OptionItem` objects; otherwise, the answer value is an array of `id` strings.
   * In case of option items with `string[]` type, whether `returnObject` is true or false, the returned answer value is always a string array.
   */
  returnObject?: boolean;
  /**
   * a callback function which is triggered when the selected values change, which can change the final selected values.
   * @param currentSelectedIds current selected option ids
   * @param previousSelectedIds previous selected option ids
   * @returns the final selected option ids
   */
  onDidChangeSelection?: (
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>
  ) => Promise<Set<string>>;
}

/**
 * text input UI config
 */
export interface InputTextConfig extends UIConfig<string> {
  /**
   * If the input value should be hidden. Defaults to false.
   */
  password?: boolean;
}

/**
 * single file selector config
 */
export interface SelectFileConfig extends UIConfig<string> {
};

/**
 * multiple files selector config
 */
export interface SelectFilesConfig extends UIConfig<string[]> {
};

/**
 * folder selector config
 */
export interface SelectFolderConfig extends UIConfig<string> {
};

/**
 * a wrapper of user input result
 */
export interface InputResult<T> {
  /**
   * `success`: the returned answer value is successfully collected when user click predefined confirm button/key, user will continue to answer the next question if available
   * `skip`: the answer value is automatically selected when `skipSingleOption` is true for single/multiple selection list, user will continue to answer the next question if available
   * `back`: the returned answer is undefined because user click the go-back button/key and will go back to re-answer the previous question in the question flow
   */
  type: "success" | "skip" | "back";
  /**
   * answer value
   */
  result?: T;
}

export type SingleSelectResult = InputResult<string | OptionItem>;

export type MultiSelectResult = InputResult<StaticOptions>;

export type InputTextResult = InputResult<string>;

export type SelectFileResult = InputResult<string>;

export type SelectFilesResult = InputResult<string[]>;

export type SelectFolderResult = InputResult<string>; 

/**
 * Definition of a runnable task
 */
export interface RunnableTask<T> {
  /**
   * task name
   */
  name?: string;
  /**
   * current progress
   */
  current?:number;
  /**
   * total progress
   */
  readonly total?:number;
  /**
   * status message
   */
  message?: string;
  /**
   * a function that realy implements the running of the task
   * @param args args
   */
  run(...args: any): Promise<Result<T,FxError>>;
  /**
   * a function that implements the cancalling of the task
   */
  cancel?(): void;
  /**
   * a state that indicate whether the task is cancelled or not
   */
  isCanceled?: boolean;
}
/**
 * task running configuration
 */
export interface TaskConfig{
  /**
   * whether task can be cancelled or not
   */
  cancellable?:boolean
  /**
   * whether to show the numeric progress of the task
   */
  showProgress?:boolean,
}

/**
 * task group configuration
 */
export interface TaskGroupConfig{
  /**
   * if true, the tasks in the group are running in paralel
   * if false, the tasks are running in sequence.
   */
  sequential ?: boolean,
  /**
   * whether to terminate all tasks if some task is failed or canceled
   */
  fastFail?: boolean
}

/**
 * Definition of user interaction, which is platform independent
 */
export interface UserInteraction {
  /**
   * Shows a single selection list
   * @param config single selection config
   * @returns A promise that resolves to the single select result wrapper or FxError
   * @throws FxError
   */
  selectOption: (config: SingleSelectConfig) => Promise<Result<SingleSelectResult,FxError>>;
  /**
   * Shows a multiple selection list
   * @param config multiple selection config
   * @returns A promise that resolves to the multiple select result wrapper or FxError
   * @throws FxError
   */
  selectOptions: (config: MultiSelectConfig) => Promise<Result<MultiSelectResult,FxError>>;
  /**
   * Opens an input box to ask the user for input.
   * @param config text input config
   * @returns A promise that resolves to the text input result wrapper or FxError
   * @throws FxError
   */
  inputText: (config: InputTextConfig) => Promise<Result<InputTextResult,FxError>>;
  /**
   * Shows a file open dialog to the user which allows to select a single file
   * @param config file selector config
   * @returns A promise that resolves to the file selector result wrapper or FxError
   * @throws FxError
   */
  selectFile: (config: SelectFileConfig) => Promise<Result<SelectFileResult,FxError>>;
  /**
   * Shows a file open dialog to the user which allows to select multiple files
   * @param config multiple files selector config
   * @returns A promise that resolves to the multiple files selector result wrapper or FxError
   * @throws FxError
   */
  selectFiles: (config: SelectFilesConfig) => Promise<Result<SelectFilesResult,FxError>>;
  /**
   * Shows a file open dialog to the user which allows to select a folder
   * @param config folder selector config
   * @returns A promise that resolves to the folder selector result wrapper or FxError
   * @throws FxError
   */
  selectFolder: (config: SelectFolderConfig) => Promise<Result<SelectFolderResult,FxError>>;
   
  /**
   * Opens a link externally in the browser. 
   * @param link The uri that should be opened.
   * @returns A promise indicating if open was successful.
   */
  openUrl(link: string): Promise<Result<boolean,FxError>>;
  /**
   * Show an information/warnning/error message to users. Optionally provide an array of items which will be presented as clickable buttons.
   * @param level message level
   * @param message The message to show.
   * @param items A set of items that will be rendered as actions in the message.
   * @returns A promise that resolves to the selected item or `undefined` when being dismissed.
   */
  showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string|undefined,FxError>>;
  
  /**
   * Show an information/warnning/error message with different colors to users, which only works for CLI.  
   * @param level message level
   * @param message The message with color to show. The color only works for CLI.
   * @param items A set of items that will be rendered as actions in the message.
   * @returns A promise that resolves to the selected item or `undefined` when being dismissed.
   */
  showMessage(
    level: "info" | "warn" | "error",
    message: Array<{content: string, color: Colors}>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string|undefined,FxError>>;

  /**
   * A function to run a task with progress bar. (CLI and VS Code has different UI experience for progress bar)
   * @param task a runnable task with progress definition
   * @param config task running confiuration
   * @param args args for task run() API
   * @returns A promise that resolves the wrapper of task running result or FxError
   */
  runWithProgress<T>(task: RunnableTask<T>, config: TaskConfig, ...args:any): Promise<Result<T,FxError>>;
}

/**
 * An implementation of task group that will define the progress when all tasks are running
 */
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
