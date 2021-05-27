// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use stricts";

import inquirer, { DistinctQuestion } from "inquirer";
import open from "open";

import {
  SingleSelectResult,
  MultiSelectResult,
  InputTextResult,
  SelectFileResult,
  SelectFilesResult,
  SelectFolderResult,
  OpenUrlResult,
  ShowMessageResult,
  RunWithProgressResult,
  SingleSelectConfig,
  MultiSelectConfig,
  InputTextConfig,
  SelectFileConfig,
  SelectFilesConfig,
  SelectFolderConfig,
  TimeConsumingTask,
  UserInteraction,
  Result,
  FxError,
  ok,
  err,
  StaticOption,
  OptionItem,
  LogLevel,
  UserCancelError,
} from "@microsoft/teamsfx-api";

import CLILogProvider from "./commonlib/log";
import { UnknownError } from "./error";
import { sleep } from "./utils";

/// TODO: input can be undefined
type ValidationType<T> = (input: T) => string | boolean | Promise<string | boolean>;

export class CLIUserInteraction implements UserInteraction {
  private static instance: CLIUserInteraction;
  private presetAnswers: Map<string, any> = new Map();

  public static getInstance(): CLIUserInteraction {
    if (!CLIUserInteraction.instance) {
      CLIUserInteraction.instance = new CLIUserInteraction();
    }
    return CLIUserInteraction.instance;
  }

  public addPresetAnswer(key: string, value: any) {
    this.presetAnswers.set(key, value);
  }

  public addPresetAnswers(answers: { [key: string]: any}) {
    for (const key in answers) {
      this.addPresetAnswer(key, answers[key]);
    }
  }

  public removePresetAnswer(key: string) {
    this.presetAnswers.delete(key);
  }

  public removePresetAnswers(keys: string[]) {
    keys.forEach(key => this.removePresetAnswer(key));
  }

  get ciEnabled(): boolean {
    return process.env.CI_ENABLED === "true";
  }

  private async runInquirer<T>(question: DistinctQuestion): Promise<Result<T, FxError>> {
    if (this.presetAnswers.has(question.name!)) {
      return ok(this.presetAnswers.get(question.name!));
    }

    /// TODO: CI ENABLED refine.
    if (this.ciEnabled) {
      if (question.default !== undefined) {
        return ok(question.default);
      } else if ("choices" in question && question.choices) {
        return ok((question.choices as Array<any>)[0]);
      }
    }

    return new Promise(async resolve => {
      try {
        const anwsers = await inquirer.prompt([question]);
        resolve(ok(anwsers[question.name!]));
      } catch(e) {
        resolve(err(UnknownError(e)));
      }
    });
  }

  private toInquirerQuestion<T>(
    type: "input" | "number" | "password" | "list" | "checkbox" | "confirm",
    name: string,
    message: string,
    choices?: string[],
    defaultValue?: T,
    validate?: ValidationType<T>
  ): DistinctQuestion {
    return { type, name, message, choices, default: defaultValue, validate };
  }

  private async singleSelect(
    name: string,
    message: string,
    choices: string[],
    defaultValue?: string,
    validate?: ValidationType<string>
  ): Promise<Result<string, FxError>> {
    return this.runInquirer(this.toInquirerQuestion("list", name, message, choices, defaultValue, validate));
  }

  private async multiSelect(
    name: string,
    message: string,
    choices: string[],
    defaultValue?: string[],
    validate?: ValidationType<string[]>
  ): Promise<Result<string[], FxError>> {
    return this.runInquirer(this.toInquirerQuestion("checkbox", name, message, choices, defaultValue, validate));
  }

  private async input(
    name: string,
    password: boolean,
    message: string,
    defaultValue?: string,
    validate?: ValidationType<string>
  ): Promise<Result<string, FxError>> {
    if (!password) {
      return this.runInquirer(this.toInquirerQuestion("input", name, message, undefined, defaultValue, validate));
    } else {
      return this.runInquirer(this.toInquirerQuestion("password", name, message, undefined, defaultValue, validate));
    }
  }

  private async confirm(name: string, message: string): Promise<Result<boolean, FxError>> {
    return this.runInquirer(this.toInquirerQuestion("confirm", name, message, undefined, undefined, undefined));
  }

  private findIndex(choices: string[], answer?: string): number {
    return choices.findIndex(choice => choice === answer);
  }

  private findIndexes(choices: string[], answers?: string[]): number[] {
    const indexes = answers?.map(answer => this.findIndex(choices, answer));
    return indexes?.filter(index => index >= 0) || [];
  }

  private getSubArray<T = string | OptionItem>(array: T[], indexes: number[]): T[] {
    return indexes.map(index => array[index]);
  }

  private toChoices<T>(option: StaticOption, defaultValue?: T): [string[], T | undefined] {
    if (typeof option[0] === "string") {
      return [option as string[], defaultValue];
    } else {
      const labels = (option as OptionItem[]).map(op => op.label);
      const ids = (option as OptionItem[]).map(op => op.id);
      if (typeof defaultValue === "string" || typeof defaultValue === "undefined") {
        const index = this.findIndex(ids, defaultValue);
        return [labels, labels[index] as any];
      } else {
        const indexes = this.findIndexes(ids, defaultValue as any);
        return [labels, this.getSubArray(labels, indexes) as any];
      }
    }
  }

  private toValidationFunc<T>(
    validate?: (input: T) => string | undefined | Promise<string | undefined>
  ): ValidationType<T> {
    return (input: T) => {
      return new Promise(async resolve => {
        const result = await validate?.(input);
        if (result === undefined) {
          resolve(true);
        } else {
          resolve(result);
        }
      });
    }
  }
  
  public async selectOption(config: SingleSelectConfig): Promise<SingleSelectResult> {
    return new Promise(async resolve => {
      const [choices, defaultValue] = this.toChoices(config.options, config.default);
      const result = await this.singleSelect(
        config.name,
        config.title,
        choices,
        defaultValue,
        this.toValidationFunc(config.validation)
      );
      if (result.isOk()) {
        const index = this.findIndex(choices, result.value);
        const anwer = config.options[index];
        if (config.returnObject) {
          resolve({ type: "success", result: anwer });
        } else {
          if (typeof anwer === "string") {
            resolve({ type: "success", result: anwer });
          } else {
            resolve({ type: "success", result: anwer.id });
          }
        }
      } else {
        resolve({ type: "error", error: result.error });
      }
    });
  }

  public async selectOptions(config: MultiSelectConfig): Promise<MultiSelectResult> {
    return new Promise(async resolve => {
      const [choices, defaultValue] = this.toChoices(config.options, config.default);
      const result = await this.multiSelect(
        config.name,
        config.title,
        choices,
        defaultValue,
        this.toValidationFunc(config.validation)
      );
      if (result.isOk()) {
        const indexes = this.findIndexes(choices, result.value);
        const anwers = this.getSubArray(config.options as any[], indexes);
        if (config.returnObject) {
          resolve({ type: "success", result: anwers });
        } else {
          if (typeof anwers[0] === "string") {
            resolve({ type: "success", result: anwers });
          } else {
            resolve({ type: "success", result: (anwers as OptionItem[]).map(answer => answer.id) });
          }
        }
      } else {
        resolve({ type: "error", error: result.error });
      }
    });
  }

  public async inputText(config: InputTextConfig): Promise<InputTextResult> {
    return new Promise(async resolve => {
      const result = await this.input(
        config.name,
        !!config.password,
        config.title,
        config.default,
        this.toValidationFunc(config.validation)
      );
      if (result.isOk()) {
        resolve({ type: "success", result: result.value });
      } else {
        resolve({ type: "error", error: result.error });
      }
    });
  }

  public async selectFile(config: SelectFileConfig): Promise<SelectFileResult> {
    const newConfig: InputTextConfig = {
      type: "text",
      name: config.name,
      title: config.title,
      default: config.default,
      validation: config.validation
    }
    return this.inputText(newConfig);
  }

  public async selectFiles(config: SelectFilesConfig): Promise<SelectFilesResult> {
    const validation = (input: string) => {
      const strings = input.split(";").map(s => s.trim());
      return config.validation?.(strings);
    }
    const newConfig: InputTextConfig = {
      type: "text",
      name: config.name,
      title: config.title + " (Please use ';' to split file paths)",
      default: config.default?.join("; "),
      validation
    }
    return new Promise(async resolve => {
      const result = await this.inputText(newConfig);
      if (result.type === "success") {
        resolve( { type: "success", result: result.result?.split(";").map(s => s.trim()) });
      } else {
        resolve( { type: "error", error: result.error });
      }
    });
  }

  public async selectFolder(config: SelectFolderConfig): Promise<SelectFolderResult> {
    const newConfig: InputTextConfig = {
      type: "text",
      name: config.name,
      title: config.title,
      default: config.default,
      validation: config.validation
    }
    return this.inputText(newConfig);
  }

  public async openUrl(link: string): Promise<OpenUrlResult> {
    await open(link);
    return { type: "success", result: true };
  }

  public async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<ShowMessageResult> {
    return new Promise(async resolve => {
      switch (items.length) {
        case 0:
          switch (level) {
            case "info":
              await CLILogProvider.necessaryLog(LogLevel.Info, message);
              break;
            case "warn":
              await CLILogProvider.necessaryLog(LogLevel.Warning, message);
              break;
            case "error":
              await CLILogProvider.necessaryLog(LogLevel.Error, message);
              break;
          }
          resolve({ type: "success" });
          break;
        case 1: {
          const result = await this.confirm("MyConfirmQuestion", message);
          if (result.isOk()) {
            if (result.value) {
              resolve({ type: "success", result: items[0] });
            } else {
              resolve({ type: "success" });
            }
          } else {
            resolve({ type: "error", error: result.error});
          }
          break;
        }
        default: {
          const result = await this.singleSelect(
            "MySingleSelectQuestion",
            message,
            modal ? items.concat("Cancel") : items
          );
          if (result.isOk()) {
            if (result.value !== "Cancel") {
              resolve({ type: "success", result: result.value });
            } else {
              resolve({ type: "success" });
            }
          } else {
            resolve({ type: "error", error: result.error});
          }
          break;
        }
      }
    });
  }

  public async runWithProgress(task: TimeConsumingTask<any>): Promise<RunWithProgressResult> {
    return new Promise(async resolve => {
      const startTime = new Date().getTime();
      const res = task.run();
      let lastLength = 0;
      
      await CLILogProvider.necessaryLog(LogLevel.Info, task.name);

      res.then((v:any) => {
        resolve(v); 
      }).catch((e:any) => { 
        resolve({ type: "error", error: UnknownError(e) });
      });

      while (task.current < task.total && !task.isCanceled) {
        const inc = task.current - lastLength;
        if (inc > 0) {
          const elapsedTime = new Date().getTime() - startTime;
          const remainingTime = (elapsedTime * (task.total - task.current)) / task.current;
          await CLILogProvider.necessaryLog(
            LogLevel.Info,
            `progress: ${Math.round(
              (task.current * 100) / task.total
            )} %, remaining time: ${Math.round(remainingTime)} ms 
            ${task.message !== undefined && task.message !== "" ? "("+task.message+")" : ""}`
          );
          lastLength += inc;
        }
        await sleep(100);
      }
      if (task.isCanceled) resolve({
        type: "error",
        error: UserCancelError
      });
      resolve({ type: "success" });
    });
  }
}

export default CLIUserInteraction.getInstance();
