// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  LogProvider,
  ok,
  ProjectSettingsV3,
  Result,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { DepsChecker, DepsType } from "../../../common/deps-checker/depsChecker";
import { CheckerFactory } from "../../../common/deps-checker/checkerFactory";
import { CoreQuestionNames } from "../../../core/question";
import { FunctionScaffold } from "./scaffold";
import { funcDepsHelper } from "./depsChecker/funcHelper";
import { ComponentNames, PathConstants, ProgrammingLanguage } from "../../constants";
import { BadComponent, invalidProjectSettings } from "../../error";
import { ErrorMessage, LogMessages, ProgressMessages, ProgressTitles } from "../../messages";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { getComponent } from "../../workflow";
import { LinuxNotSupportedError } from "../../../common/deps-checker/depsError";
import { LanguageStrategyFactory } from "./language-strategy";
import { execute } from "../utils";
import { ApiConstants } from "../constants";
import { DepsManager } from "../../../common/deps-checker";
import { funcDepsTelemetry } from "./depsChecker/funcPluginTelemetry";
import { QuestionKey } from "./enums";
import { FuncPluginLogger } from "./depsChecker/funcPluginLogger";
/**
 * api scaffold
 */
@Service("api-code")
export class ApiCodeProvider {
  name = "api-code";
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.scaffoldApi,
      progressSteps: 1,
      errorSource: "api",
    }),
  ])
  async generate(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const appName = projectSettings.appName;
    const language = inputs[CoreQuestionNames.ProgrammingLanguage];
    const folder = inputs.folder || PathConstants.apiWorkingDir;
    const workingDir = path.join(inputs.projectPath, folder);
    const functionName = inputs[QuestionKey.functionName];
    const variables = {
      appName: appName,
      functionName: functionName,
    };
    await actionContext?.progressBar?.next(ProgressMessages.scaffoldApi);
    await FunctionScaffold.scaffoldFunction(
      workingDir,
      language,
      ApiConstants.functionTriggerType,
      functionName,
      variables,
      context.logProvider
    );
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingApi,
      progressSteps: 1,
    }),
  ])
  async build(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const teamsApi = getComponent(context.projectSetting, ComponentNames.TeamsApi);
    if (!teamsApi) return ok(undefined);
    if (teamsApi.folder == undefined) throw new BadComponent("api", this.name, "folder");
    const language = context.projectSetting.programmingLanguage;
    if (!language || !Object.values(ProgrammingLanguage).includes(language as ProgrammingLanguage))
      throw new invalidProjectSettings(ErrorMessage.programmingLanguageInvalid);
    const buildPath = path.resolve(inputs.projectPath, teamsApi.folder);

    await this.handleDotnetChecker(context, inputs);
    try {
      await this.installFuncExtensions(
        buildPath,
        language as ProgrammingLanguage,
        context.logProvider
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        // wrap the original error to UserError so the extensibility model will pop-up a dialog correctly
        throw funcDepsHelper.transferError(error);
      } else {
        throw error;
      }
    }

    await actionContext?.progressBar?.next(ProgressMessages.buildingApi);
    for (const commandItem of LanguageStrategyFactory.getStrategy(language as ProgrammingLanguage)
      .buildCommands) {
      const command: string = commandItem.command;
      const relativePath: string = commandItem.relativePath;
      const absolutePath: string = path.join(buildPath, relativePath);
      await execute(command, absolutePath, context.logProvider);
    }
    return ok(undefined);
  }

  private async handleDotnetChecker(ctx: ContextV3, inputs: InputsWithProjectPath): Promise<void> {
    const funcDepsLogger = new FuncPluginLogger(ctx.logProvider);
    const dotnetChecker: DepsChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      funcDepsLogger,
      funcDepsTelemetry
    );
    try {
      if (!(await funcDepsHelper.dotnetCheckerEnabled(inputs))) {
        return;
      }
      await dotnetChecker.resolve();
    } catch (error) {
      if (error instanceof LinuxNotSupportedError) {
        return;
      }
      if (error instanceof Error) {
        funcDepsLogger.error(LogMessages.failedToInstallDotnet(error));
        await funcDepsLogger.printDetailLog();
        throw funcDepsHelper.transferError(error);
      } else {
        throw error;
      }
    } finally {
      funcDepsLogger.cleanup();
    }
  }

  private async installFuncExtensions(
    componentPath: string,
    language: ProgrammingLanguage,
    logger: LogProvider
  ): Promise<void> {
    if (LanguageStrategyFactory.getStrategy(language).skipFuncExtensionInstall) {
      return;
    }
    const funcDepsLogger = new FuncPluginLogger(logger);
    const binPath = path.join(componentPath, PathConstants.functionExtensionsFolderName);
    const depsManager = new DepsManager(funcDepsLogger, funcDepsTelemetry);
    const dotnetStatus = (await depsManager.getStatus([DepsType.Dotnet]))[0];

    await funcDepsHelper.installFuncExtension(
      componentPath,
      dotnetStatus.command,
      funcDepsLogger,
      PathConstants.functionExtensionsFileName,
      binPath
    );
  }
}
