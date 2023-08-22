// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use stricts";

import chalk from "chalk";
import fs from "fs-extra";
import inquirer, { DistinctQuestion } from "inquirer";
import open from "open";
import path from "path";

import {
  Colors,
  FxError,
  IProgressHandler,
  InputTextConfig,
  InputTextResult,
  LogLevel,
  MultiSelectConfig,
  MultiSelectResult,
  OptionItem,
  Result,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleFileOrInputConfig,
  SingleSelectConfig,
  SingleSelectResult,
  StaticOptions,
  UserInteraction,
  err,
  ok,
} from "@microsoft/teamsfx-api";

import {
  InputValidationError,
  MissingRequiredInputError,
  SelectSubscriptionError,
  UnhandledError,
  assembleError,
  loadingOptionsPlaceholder,
} from "@microsoft/teamsfx-core";
import CLILogProvider from "./commonlib/log";
import Progress from "./console/progress";
import ScreenManager from "./console/screen";
import { cliSource } from "./constants";
import { ChoiceOptions } from "./prompts";
import { UserSettings } from "./userSetttings";
import { getColorizedString, toLocaleLowerCase } from "./utils";
import * as util from "util";
import { strings } from "./resource";
import { globals } from "./globals";
/// TODO: input can be undefined
type ValidationType<T> = (input: T) => string | boolean | Promise<string | boolean>;

class CLIUserInteraction implements UserInteraction {
  private static instance: CLIUserInteraction;
  private presetAnswers: Map<string, any> = new Map();

  private _interactive = true;

  get ciEnabled(): boolean {
    return process.env.CI_ENABLED === "true";
  }

  get interactive(): boolean {
    if (this.ciEnabled) {
      return false;
    } else {
      return this._interactive;
    }
  }

  set interactive(value: boolean) {
    this._interactive = value;
  }

  public static getInstance(): CLIUserInteraction {
    if (!CLIUserInteraction.instance) {
      CLIUserInteraction.instance = new CLIUserInteraction();

      // get global setting `interactive`
      const result = UserSettings.getInteractiveSetting();
      if (result.isErr()) {
        throw result;
      }
      CLIUserInteraction.instance._interactive = result.value;
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

    if (typeof (config.options as StaticOptions)[0] === "string") {
      return;
    }
    const options = config.options as OptionItem[];
    const ids = options.map((op) => op.id);
    const cliNames = options.map((op) => op.cliName || toLocaleLowerCase(op.id));

    const presetAnwser = this.presetAnswers.get(config.name);
    if (presetAnwser instanceof Array) {
      if (presetAnwser.length === 0) {
        return;
      }

      const idIndexes = this.findIndexes(ids, presetAnwser);
      const cliNameIndexes = this.findIndexes(cliNames, presetAnwser);

      const idSubArray1 = this.getSubArray(ids, idIndexes);
      const idSubArray2 = this.getSubArray(ids, cliNameIndexes);

      if (idSubArray1[0] !== undefined) {
        this.updatePresetAnswer(config.name, idSubArray1);
      } else if (idSubArray2[0] !== undefined) {
        this.updatePresetAnswer(config.name, idSubArray2);
      }
    } else {
      const idIndex = this.findIndex(ids, presetAnwser);
      const cliNameIndex = this.findIndex(cliNames, presetAnwser);

      if (idIndex >= 0) {
        this.updatePresetAnswer(config.name, ids[idIndex]);
      } else if (cliNameIndex >= 0) {
        this.updatePresetAnswer(config.name, ids[cliNameIndex]);
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

  private async runInquirer<T>(question: DistinctQuestion): Promise<Result<T, FxError>> {
    const questionName = question.name!;
    if (this.presetAnswers.has(questionName)) {
      const answer = this.presetAnswers.get(questionName);
      if (answer === undefined) {
        /// TOOD: this is only for APIM
        return ok(answer);
      }
      const result = await question.validate?.(answer);
      if (typeof result === "string") {
        return err(new InputValidationError(questionName, result));
      }
      return ok(answer);
    }

    /// non-interactive.
    if (!this.interactive) {
      if (question.default !== undefined) {
        // if it has a defualt value, return it at first.
        return ok(question.default);
      }
      if (globals.options.includes(questionName)) {
        // if the question is the required option, return error if value is missing
        return err(new MissingRequiredInputError(questionName, cliSource));
      }
      if (
        question.type === "list" &&
        Array.isArray(question.choices) &&
        question.choices.length > 0
      ) {
        // if it is a single select, return the first choice.
        const firstChoice = question.choices[0];
        if (typeof firstChoice === "string") {
          // TODO: maybe prevent type casting with compile time type assertions or method overloading?
          return ok(firstChoice as any);
        } else {
          return ok((firstChoice as ChoiceOptions).name as any);
        }
      } else if (question.type === "checkbox") {
        // if it is a multi select, return an empty array.
        return ok([] as any);
      } else {
        return ok(question.default);
      }
    }
    try {
      ScreenManager.pause();
      const anwsers = await inquirer.prompt([question]);
      ScreenManager.continue();
      return ok(anwsers[question.name!]);
    } catch (e) {
      return err(new UnhandledError(e as Error, cliSource));
    }
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

  async singleSelect(
    name: string,
    message: string,
    choices: ChoiceOptions[],
    defaultValue?: string,
    validate?: ValidationType<string>
  ): Promise<Result<string, FxError>> {
    return this.runInquirer(
      this.toInquirerQuestion("list", name, message, choices, defaultValue, validate)
    );
  }

  async multiSelect(
    name: string,
    message: string,
    choices: ChoiceOptions[],
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

  private toChoices<T>(option: StaticOptions, defaultValue?: T): [ChoiceOptions[], T | undefined] {
    const labelClean = (label: string) => {
      return label
        .replace("$(browser)", "")
        .replace("$(hubot)", "")
        .replace("$(comment-discussion)", "");
    };
    if (typeof option[0] === "string") {
      const choices = (option as string[]).map((op) => {
        return {
          name: op,
          extra: {
            title: op,
          },
        };
      });
      return [choices, defaultValue];
    } else {
      const choices = (option as OptionItem[]).map((op) => {
        return {
          name: op.id,
          extra: {
            title: labelClean(op.label),
            description: op.description,
            detail: op.detail,
          },
        };
      });
      const ids = (option as OptionItem[]).map((op) => op.id);
      if (typeof defaultValue === "string" || typeof defaultValue === "undefined") {
        const index = this.findIndex(ids, defaultValue);
        return [choices, choices[index]?.name as any];
      } else {
        const indexes = this.findIndexes(ids, defaultValue as any);
        return [choices, this.getSubArray(choices, indexes).map((choice) => choice.name) as any];
      }
    }
  }

  private toValidationFunc<T>(
    validate?: (input: T) => string | undefined | Promise<string | undefined>,
    mapping?: { [x: string]: string }
  ): ValidationType<T> {
    return async (input: T) => {
      if (mapping) {
        if (typeof input === "string") {
          input = mapping[input] as any;
        } else if (Array.isArray(input)) {
          input = input.map((i) => mapping[i]) as any;
        }
      }
      const result = await validate?.(input);
      if (result === undefined) {
        return true;
      } else {
        return result;
      }
    };
  }

  public async selectOption(
    config: SingleSelectConfig
  ): Promise<Result<SingleSelectResult, FxError>> {
    if (config.name === "subscription") {
      const subscriptions = config.options as string[];
      if (subscriptions.length === 0) {
        return err(new SelectSubscriptionError(cliSource));
      } else if (subscriptions.length === 1) {
        const sub = subscriptions[0];
        CLILogProvider.necessaryLog(
          LogLevel.Warning,
          `Your Azure account only has one subscription (${sub}). Use it as default.`
        );
        return ok({ type: "skip", result: sub });
      }
    }
    const loadRes = await this.loadSelectDynamicData(config);
    if (loadRes.isErr()) {
      return err(loadRes.error);
    }
    if (config.options.length === 1 && config.skipSingleOption) {
      const answer = (config.options as StaticOptions)[0];
      if (config.returnObject) {
        return ok({ type: "skip", result: answer });
      } else {
        if (typeof answer === "string") {
          return ok({ type: "skip", result: answer });
        } else {
          return ok({ type: "skip", result: answer.id });
        }
      }
    }
    this.updatePresetAnswerFromConfig(config);
    const [choices, defaultValue] = this.toChoices(
      config.options as StaticOptions,
      config.default as string
    );
    const result = await this.singleSelect(
      config.name,
      config.title,
      choices,
      defaultValue,
      this.toValidationFunc(config.validation)
    );
    if (result.isOk()) {
      const index = this.findIndex(
        choices.map((choice) => choice.name),
        result.value
      );
      if (index < 0) {
        const error = new InputValidationError(
          config.name,
          util.format(
            strings["error.InvalidOptionErrorReason"],
            result.value,
            choices.map((choice) => choice.name).join(",")
          )
        );
        error.source = cliSource;
        return err(error);
      }
      const answer = (config.options as StaticOptions)[index];
      if (!answer || config.returnObject) {
        return ok({ type: "success", result: answer });
      } else {
        if (typeof answer === "string") {
          return ok({ type: "success", result: answer });
        } else {
          return ok({ type: "success", result: answer.id });
        }
      }
    } else {
      return err(result.error);
    }
  }

  async loadSelectDynamicData(
    config: MultiSelectConfig | SingleSelectConfig
  ): Promise<Result<undefined, FxError>> {
    if (typeof config.options === "function" || typeof config.default === "function") {
      // const bar = this.createProgressBar(config.title, 1);
      // await bar.start();
      // await bar.next(loadingOptionsPlaceholder());
      try {
        if (typeof config.options === "function") {
          const options = await config.options();
          config.options = options;
        }
        if (typeof config.default === "function") {
          config.default = await config.default();
        }
        return ok(undefined);
      } catch (e) {
        return err(assembleError(e));
      } finally {
        // await bar.end(true, true);
      }
    }
    return ok(undefined);
  }

  async loadDefaultValue(
    config: InputTextConfig | SelectFileConfig | SelectFilesConfig
  ): Promise<Result<undefined, FxError>> {
    if (typeof config.default === "function") {
      // const bar = this.createProgressBar(config.title, 1);
      // await bar.start();
      // await bar.next(loadingOptionsPlaceholder());
      try {
        if (typeof config.default === "function") {
          config.default = await config.default();
        }
        return ok(undefined);
      } catch (e) {
        return err(assembleError(e));
      } finally {
        // await bar.end(true, true);
      }
    }
    return ok(undefined);
  }

  public async selectOptions(
    config: MultiSelectConfig
  ): Promise<Result<MultiSelectResult, FxError>> {
    const loadRes = await this.loadSelectDynamicData(config);
    if (loadRes.isErr()) {
      return err(loadRes.error);
    }
    if (config.options.length === 1 && config.skipSingleOption) {
      const answers = config.options as StaticOptions;
      if (config.returnObject) {
        return ok({ type: "skip", result: answers });
      } else {
        if (typeof answers[0] === "string") {
          return ok({ type: "skip", result: answers });
        } else {
          return ok({ type: "skip", result: (answers as OptionItem[]).map((a) => a.id) });
        }
      }
    }
    this.updatePresetAnswerFromConfig(config);
    const [choices, defaultValue] = this.toChoices(
      config.options as StaticOptions,
      config.default as string[]
    );
    const result = await this.multiSelect(
      config.name,
      config.title,
      choices,
      defaultValue,
      this.toValidationFunc(config.validation)
    );
    if (result.isOk()) {
      const indexes = this.findIndexes(
        choices.map((choice) => choice.name),
        result.value
      );
      if (result.value.length > 0 && indexes.length === 0) {
        // the condition means the user input is invalid, none of the choices is in the provided values
        const error = new InputValidationError(
          config.name,
          util.format(
            strings["error.InvalidOptionErrorReason"],
            result.value.join(","),
            choices.map((choice) => choice.name).join(",")
          )
        );
        error.source = cliSource;
        return err(error);
      }
      const anwers = this.getSubArray(config.options as StaticOptions as any[], indexes);
      if (config.returnObject) {
        return ok({ type: "success", result: anwers });
      } else {
        if (typeof anwers[0] === "string") {
          return ok({ type: "success", result: anwers });
        } else {
          return ok({
            type: "success",
            result: (anwers as OptionItem[]).map((answer) => answer.id),
          });
        }
      }
    } else {
      return err(result.error);
    }
  }

  public async inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    const loadRes = await this.loadDefaultValue(config);
    if (loadRes.isErr()) {
      return err(loadRes.error);
    }

    let validationFunc: (input: string) => string | undefined | Promise<string | undefined> = (
      input
    ) => {
      return undefined;
    };
    if (config.validation || config.additionalValidationOnAccept) {
      validationFunc = async (input: string) => {
        let res: string | undefined = undefined;
        if (config.validation) {
          res = await config.validation(input);
        }

        if (!res && !!config.additionalValidationOnAccept) {
          res = await config.additionalValidationOnAccept(input);
        }

        return res;
      };
    }
    const result = await this.input(
      config.name,
      !!config.password,
      config.title,
      config.default as string,
      this.toValidationFunc(validationFunc)
    );
    if (result.isOk()) {
      return ok({ type: "success", result: result.value });
    } else {
      return err(result.error);
    }
  }

  public async selectFileOrInput(
    config: SingleFileOrInputConfig
  ): Promise<Result<InputTextResult, FxError>> {
    const loadRes = await this.loadDefaultValue(config.inputBoxConfig);
    if (loadRes.isErr()) return err(loadRes.error);
    return this.inputText({
      ...config.inputBoxConfig,
      validation: config.validation,
    });
  }
  public async selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    const loadRes = await this.loadDefaultValue(config);
    if (loadRes.isErr()) {
      return err(loadRes.error);
    }
    const newConfig: InputTextConfig = {
      name: config.name,
      title: config.title,
      default: (config.default as string) || "./",
      validation: config.validation || pathValidation,
    };
    return this.inputText(newConfig);
  }
  public async selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    const loadRes = await this.loadDefaultValue(config);
    if (loadRes.isErr()) {
      return err(loadRes.error);
    }
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
      default: (config.default as string[])?.join("; "),
      validation,
    };
    const result = await this.inputText(newConfig);
    if (result.isOk()) {
      return ok({
        type: "success",
        result: result.value.result?.split(";").map((s) => s.trim()),
      });
    } else {
      return err(result.error);
    }
  }

  public async selectFolder(
    config: SelectFolderConfig
  ): Promise<Result<SelectFolderResult, FxError>> {
    const loadRes = await this.loadDefaultValue(config);
    if (loadRes.isErr()) {
      return err(loadRes.error);
    }
    const newConfig: InputTextConfig = {
      name: config.name,
      title: config.title,
      default: (config.default as string) || "./",
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
        return ok(undefined);
      case 1: {
        const result = await this.confirm("MyConfirmQuestion", plainText);
        if (result.isOk()) {
          if (result.value) {
            return ok(items[0]);
          } else {
            return ok(undefined);
          }
        } else {
          return err(result.error);
        }
      }
      default: {
        /// default value is set to the first element of items.
        const [choices, defaultValue] = this.toChoices(
          modal ? items.concat("Cancel") : items,
          items[0]
        );
        const result = await this.singleSelect(
          "MySingleSelectQuestion",
          plainText,
          choices,
          defaultValue
        );
        if (result.isOk()) {
          if (result.value !== "Cancel") {
            return ok(result.value);
          } else {
            return ok(undefined);
          }
        } else {
          return err(result.error);
        }
      }
    }
  }

  public createProgressBar(title: string, totalSteps: number): IProgressHandler {
    return new Progress(title, totalSteps);
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
