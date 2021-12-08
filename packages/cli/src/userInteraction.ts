// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use stricts";

import chalk from "chalk";
import fs from "fs-extra";
import inquirer, { DistinctQuestion } from "inquirer";
import path from "path";
import open from "open";

import {
  SingleSelectResult,
  MultiSelectResult,
  InputTextResult,
  SelectFileResult,
  SelectFilesResult,
  SelectFolderResult,
  SingleSelectConfig,
  MultiSelectConfig,
  InputTextConfig,
  SelectFileConfig,
  SelectFilesConfig,
  SelectFolderConfig,
  RunnableTask,
  Result,
  FxError,
  ok,
  err,
  StaticOptions,
  OptionItem,
  LogLevel,
  UserCancelError,
  TaskConfig,
  assembleError,
  UserInteraction,
  Colors,
  IProgressHandler,
  Json,
  OnSelectionChangeFunc,
} from "@microsoft/teamsfx-api";

import CLILogProvider from "./commonlib/log";
import { EmptySubConfigOptions, NotValidInputValue, UnknownError } from "./error";
import { sleep, getColorizedString, toLocaleLowerCase } from "./utils";
import { ChoiceOptions } from "./prompts";
import Progress from "./console/progress";
import ScreenManager from "./console/screen";

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

  public updatePresetAnswer(key: string, value: any) {
    this.presetAnswers.set(key, value);
  }

  public updatePresetAnswers(question: { [_: string]: any }, answers: { [key: string]: any }) {
    for (const key in answers) {
      if (key in question) {
        this.updatePresetAnswer(key, answers[key]);
      }
    }
  }

  public updatePresetAnswerFromConfig(config: SingleSelectConfig | MultiSelectConfig) {
    if (!this.presetAnswers.has(config.name)) {
      return;
    }

    if (typeof config.options[0] === "string") {
      return;
    }
    const options = config.options as OptionItem[];
    const labels = options.map((op) => op.label);
    const ids = options.map((op) => op.id);
    const cliNames = options.map((op) => op.cliName || toLocaleLowerCase(op.id));

    const presetAnwser = this.presetAnswers.get(config.name);
    if (presetAnwser instanceof Array) {
      if (presetAnwser.length === 0) {
        return;
      }

      const idIndexes = this.findIndexes(ids, presetAnwser);
      const cliNameIndexes = this.findIndexes(cliNames, presetAnwser);

      const labelSubArray1 = this.getSubArray(labels, idIndexes);
      const labelSubArray2 = this.getSubArray(labels, cliNameIndexes);

      if (labelSubArray1[0] !== undefined) {
        this.updatePresetAnswer(config.name, labelSubArray1);
      } else if (labelSubArray2[0] !== undefined) {
        this.updatePresetAnswer(config.name, labelSubArray2);
      }
    } else {
      const idIndex = this.findIndex(ids, presetAnwser);
      const cliNameIndex = this.findIndex(cliNames, presetAnwser);

      if (idIndex >= 0) {
        this.updatePresetAnswer(config.name, labels[idIndex]);
      } else if (cliNameIndex >= 0) {
        this.updatePresetAnswer(config.name, labels[cliNameIndex]);
      }
    }
  }

  public removePresetAnswer(key: string) {
    this.presetAnswers.delete(key);
  }

  public removePresetAnswers(keys: string[]) {
    keys.forEach((key) => this.removePresetAnswer(key));
  }

  public clearPresetAnswers() {
    this.presetAnswers = new Map();
  }

  get ciEnabled(): boolean {
    return process.env.CI_ENABLED === "true";
  }

  get calledFromVS(): boolean {
    return process.env.VS_CALLING_CLI === "true";
  }

  private async runInquirer<T>(question: DistinctQuestion): Promise<Result<T, FxError>> {
    if (this.presetAnswers.has(question.name!)) {
      const answer = this.presetAnswers.get(question.name!);
      if (answer === undefined) {
        /// TOOD: this is only for APIM
        return ok(answer);
      }
      const result = await question.validate?.(answer);
      if (typeof result === "string") {
        return err(NotValidInputValue(question.name!, result));
      }
      return ok(answer);
    }

    /// TODO: CI ENABLED refine.
    if (this.ciEnabled || this.calledFromVS) {
      if (question.default !== undefined) {
        return ok(question.default);
      } else if (
        "choices" in question &&
        question.choices &&
        Array.isArray(question.choices) &&
        question.choices.length > 0
      ) {
        const firstChoice = question.choices[0];
        if (typeof firstChoice === "string") {
          // TODO: maybe prevent type casting with compile time type assertions or method overloading?
          return ok(firstChoice as any);
        } else {
          return ok((firstChoice as ChoiceOptions).name as any);
        }
      }
    }

    return new Promise(async (resolve) => {
      try {
        ScreenManager.pause();
        const anwsers = await inquirer.prompt([question]);
        ScreenManager.continue();
        resolve(ok(anwsers[question.name!]));
      } catch (e) {
        resolve(err(UnknownError(e)));
      }
    });
  }

  private toInquirerQuestion<T>(
    type: "input" | "number" | "password" | "list" | "checkbox" | "confirm",
    name: string,
    message: string,
    choices?: string[] | ChoiceOptions[],
    defaultValue?: T,
    validate?: ValidationType<T>
  ): DistinctQuestion {
    return {
      type,
      name,
      message: chalk.whiteBright.bold(message),
      choices,
      default: defaultValue,
      validate,
      prefix: chalk.blueBright("?"),
      suffix: chalk.whiteBright.bold(":"),
    };
  }

  private async singleSelect(
    name: string,
    message: string,
    choices: string[] | ChoiceOptions[],
    defaultValue?: string,
    validate?: ValidationType<string>
  ): Promise<Result<string, FxError>> {
    return this.runInquirer(
      this.toInquirerQuestion("list", name, message, choices, defaultValue, validate)
    );
  }

  private async multiSelect(
    name: string,
    message: string,
    choices: string[] | ChoiceOptions[],
    defaultValue?: string[],
    validate?: ValidationType<string[]>
  ): Promise<Result<string[], FxError>> {
    return this.runInquirer(
      this.toInquirerQuestion("checkbox", name, message, choices, defaultValue, validate)
    );
  }

  private async input(
    name: string,
    password: boolean,
    message: string,
    defaultValue?: string,
    validate?: ValidationType<string>
  ): Promise<Result<string, FxError>> {
    if (!password) {
      return this.runInquirer(
        this.toInquirerQuestion("input", name, message, undefined, defaultValue, validate)
      );
    } else {
      return this.runInquirer(
        this.toInquirerQuestion("password", name, message, undefined, defaultValue, validate)
      );
    }
  }

  private async confirm(name: string, message: string): Promise<Result<boolean, FxError>> {
    /// default value is set to true.
    return this.runInquirer(
      this.toInquirerQuestion("confirm", name, message, undefined, true, undefined)
    );
  }

  private findIndex(choices: (string | undefined)[], answer?: string): number {
    return choices.findIndex((choice) => choice === answer);
  }

  private findIndexes(choices: (string | undefined)[], answers?: string[]): number[] {
    const indexes = answers?.map((answer) => this.findIndex(choices, answer));
    return indexes?.filter((index) => index >= 0) || [];
  }

  private getSubArray<T = string | OptionItem>(array: T[], indexes: number[]): T[] {
    return indexes.map((index) => array[index]);
  }

  private toChoices<T>(
    option: StaticOptions,
    defaultValue?: T
  ): [string[] | ChoiceOptions[], T | undefined, { [x: string]: string }] {
    const mapping: Json = {};
    if (typeof option[0] === "string") {
      const choices = option as string[];
      choices.forEach((s) => (mapping[s] = s));
      return [choices, defaultValue, mapping];
    } else {
      const choices = (option as OptionItem[]).map((op) => {
        mapping[op.label] = op.id;
        return {
          name: op.label,
          extra: {
            description: op.description,
            detail: op.detail,
          },
        };
      });
      const ids = (option as OptionItem[]).map((op) => op.id);
      if (typeof defaultValue === "string" || typeof defaultValue === "undefined") {
        const index = this.findIndex(ids, defaultValue);
        return [choices, choices[index]?.name as any, mapping];
      } else {
        const indexes = this.findIndexes(ids, defaultValue as any);
        return [
          choices,
          this.getSubArray(choices, indexes).map((choice) => choice.name) as any,
          mapping,
        ];
      }
    }
  }

  private toValidationFunc<T>(
    validate?: (input: T) => string | undefined | Promise<string | undefined>,
    mapping?: { [x: string]: string }
  ): ValidationType<T> {
    return (input: T) => {
      if (mapping) {
        if (typeof input === "string") {
          input = mapping[input] as any;
        } else if (Array.isArray(input)) {
          input = input.map((i) => mapping[i]) as any;
        }
      }
      return new Promise(async (resolve) => {
        const result = await validate?.(input);
        if (result === undefined) {
          resolve(true);
        } else {
          resolve(result);
        }
      });
    };
  }

  public async selectOption(
    config: SingleSelectConfig
  ): Promise<Result<SingleSelectResult, FxError>> {
    if (config.name === "subscription") {
      const subscriptions = config.options as string[];
      if (subscriptions.length === 0) {
        return err(EmptySubConfigOptions());
      } else if (subscriptions.length === 1) {
        const sub = subscriptions[0];
        CLILogProvider.necessaryLog(
          LogLevel.Warning,
          `Your Azure account only has one subscription (${sub}). Use it as default.`
        );
        return ok({ type: "success", result: sub });
      }
    }
    this.updatePresetAnswerFromConfig(config);
    return new Promise(async (resolve) => {
      const [choices, defaultValue, mapping] = this.toChoices(config.options, config.default);
      const result = await this.singleSelect(
        config.name,
        config.title,
        choices,
        defaultValue,
        this.toValidationFunc(config.validation, mapping)
      );
      if (result.isOk()) {
        const index = this.findIndex(
          typeof choices[0] === "string"
            ? (choices as string[])
            : (choices as ChoiceOptions[]).map((choice) => choice.name),
          result.value
        );
        const anwser = config.options[index];
        if (config.returnObject) {
          resolve(ok({ type: "success", result: anwser }));
        } else {
          if (typeof anwser === "string") {
            resolve(ok({ type: "success", result: anwser }));
          } else {
            resolve(ok({ type: "success", result: anwser.id }));
          }
        }
      } else {
        resolve(err(result.error));
      }
    });
  }

  public async selectOptions(
    config: MultiSelectConfig
  ): Promise<Result<MultiSelectResult, FxError>> {
    this.updatePresetAnswerFromConfig(config);
    return new Promise(async (resolve) => {
      const [choices, defaultValue, mapping] = this.toChoices(config.options, config.default);
      const result = await this.multiSelect(
        config.name,
        config.title,
        choices,
        defaultValue,
        this.toValidationFunc(config.validation, mapping)
      );
      if (result.isOk()) {
        const indexes = this.findIndexes(
          typeof choices[0] === "string"
            ? (choices as string[])
            : (choices as ChoiceOptions[]).map((choice) => choice.name),
          result.value
        );
        const anwers = this.getSubArray(config.options as any[], indexes);
        if (config.returnObject) {
          resolve(ok({ type: "success", result: anwers }));
        } else {
          if (typeof anwers[0] === "string") {
            resolve(ok({ type: "success", result: anwers }));
          } else {
            resolve(
              ok({ type: "success", result: (anwers as OptionItem[]).map((answer) => answer.id) })
            );
          }
        }
      } else {
        resolve(err(result.error));
      }
    });
  }

  public async inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    return new Promise(async (resolve) => {
      const result = await this.input(
        config.name,
        !!config.password,
        config.title,
        config.default,
        this.toValidationFunc(config.validation)
      );
      if (result.isOk()) {
        resolve(ok({ type: "success", result: result.value }));
      } else {
        resolve(err(result.error));
      }
    });
  }

  public async selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    const newConfig: InputTextConfig = {
      name: config.name,
      title: config.title,
      default: config.default || "./",
      validation: config.validation || pathValidation,
    };
    return this.inputText(newConfig);
  }

  public async selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    const validation = async (input: string) => {
      const strings = input.split(";").map((s) => s.trim());
      if (config.validation) {
        return config.validation(strings);
      } else {
        for (const s of strings) {
          const result = await pathValidation(s);
          if (result !== undefined) {
            return result;
          }
        }
      }
      return undefined;
    };
    const newConfig: InputTextConfig = {
      name: config.name,
      title: config.title + " (Please use ';' to split file paths)",
      default: config.default?.join("; "),
      validation,
    };
    return new Promise(async (resolve) => {
      const result = await this.inputText(newConfig);
      if (result.isOk()) {
        resolve(
          ok({ type: "success", result: result.value.result?.split(";").map((s) => s.trim()) })
        );
      } else {
        resolve(err(result.error));
      }
    });
  }

  public async selectFolder(
    config: SelectFolderConfig
  ): Promise<Result<SelectFolderResult, FxError>> {
    const newConfig: InputTextConfig = {
      name: config.name,
      title: config.title,
      default: config.default || "./",
      validation: config.validation || pathValidation,
    };
    return this.inputText(newConfig);
  }

  public async openUrl(link: string): Promise<Result<boolean, FxError>> {
    if (!this.ciEnabled) await open(link);
    return ok(true);
  }

  public async showMessage(
    level: "info" | "warn" | "error",
    message: string | Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>> {
    let plainText: string;
    if (message instanceof Array) {
      plainText = message.map((x) => x.content).join("");
    } else {
      plainText = message;
    }
    return new Promise(async (resolve) => {
      switch (items.length) {
        case 0:
          switch (level) {
            case "info":
              if (message instanceof Array) {
                CLILogProvider.necessaryLog(LogLevel.Info, getColorizedString(message));
              } else {
                CLILogProvider.necessaryLog(LogLevel.Info, message);
              }
              break;
            case "warn":
              CLILogProvider.necessaryLog(LogLevel.Warning, plainText);
              break;
            case "error":
              CLILogProvider.necessaryLog(LogLevel.Error, plainText);
              break;
          }
          resolve(ok(undefined));
          break;
        case 1: {
          const result = await this.confirm("MyConfirmQuestion", plainText);
          if (result.isOk()) {
            if (result.value) {
              resolve(ok(items[0]));
            } else {
              resolve(ok(undefined));
            }
          } else {
            resolve(err(result.error));
          }
          break;
        }
        default: {
          /// default value is set to the first element of items.
          const result = await this.singleSelect(
            "MySingleSelectQuestion",
            plainText,
            modal ? items.concat("Cancel") : items,
            items[0]
          );
          if (result.isOk()) {
            if (result.value !== "Cancel") {
              resolve(ok(result.value));
            } else {
              resolve(ok(undefined));
            }
          } else {
            resolve(err(result.error));
          }
          break;
        }
      }
    });
  }

  public createProgressBar(title: string, totalSteps: number): IProgressHandler {
    return new Progress(title, totalSteps);
  }

  public async runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    return new Promise(async (resolve) => {
      let lastReport = 0;
      const showProgress = config.showProgress === true;
      const total = task.total ? task.total : 1;
      const head = `[Teams Toolkit] ${task.name ? task.name : ""}`;
      const report = async (task: RunnableTask<T>) => {
        const current = task.current ? task.current : 0;
        const body = showProgress
          ? `: ${Math.round((current * 100) / total)} %`
          : `: [${current + 1}/${total}]`;
        const tail = task.message ? ` ${task.message}` : "Prepare task.";
        const message = `${head}${body}${tail}`;
        if (showProgress) CLILogProvider.necessaryLog(LogLevel.Info, message);
      };
      task
        .run(args)
        .then(async (v) => {
          report(task);
          await sleep(100);
          resolve(v);
        })
        .catch((e) => {
          resolve(err(assembleError(e)));
        });
      let current;
      if (showProgress) {
        report(task);
        do {
          current = task.current ? task.current : 0;
          const inc = ((current - lastReport) * 100) / total;
          const delta = current - lastReport;
          if (inc > 0) {
            report(task);
            lastReport += delta;
          }
          await sleep(100);
        } while (current < total && !task.isCanceled);
        report(task);
        await sleep(100);
      } else {
        do {
          report(task);
          await sleep(100);
          current = task.current ? task.current : 0;
        } while (current < total && !task.isCanceled);
      }
      if (task.isCanceled) resolve(err(UserCancelError));
    });
  }
}

async function pathValidation(p: string): Promise<string | undefined> {
  if (p === "") {
    return "Path cannot be empty.";
  }
  if (await fs.pathExists(path.resolve(p))) {
    return undefined;
  } else {
    return `${path.resolve(p)} does not exist.`;
  }
}

export default CLIUserInteraction.getInstance();
