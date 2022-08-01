// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  ok,
  ProjectSettingsV3,
  Result,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { DepsChecker, DepsType } from "../../common/deps-checker/depsChecker";
import { CheckerFactory } from "../../common/deps-checker/checkerFactory";
import { CoreQuestionNames } from "../../core/question";
import { DefaultValues, FunctionPluginPathInfo } from "../../plugins/resource/function/constants";
import { FunctionLanguage, QuestionKey } from "../../plugins/resource/function/enums";
import { FunctionDeploy } from "../../plugins/resource/function/ops/deploy";
import { FunctionScaffold } from "../../plugins/resource/function/ops/scaffold";
import { funcDepsHelper } from "../../plugins/resource/function/utils/depsChecker/funcHelper";
import { ComponentNames } from "../constants";
import { BadComponent, invalidProjectSettings } from "../error";
import { ErrorMessage, ProgressMessages, ProgressTitles } from "../messages";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { getComponent } from "../workflow";
import { TelemetryHelper } from "../../plugins/resource/function/utils/telemetry-helper";
import { Logger } from "../../plugins/resource/function/utils/logger";
import { funcDepsLogger } from "../../plugins/resource/function/utils/depsChecker/funcPluginLogger";
import { funcDepsTelemetry } from "../../plugins/resource/function/utils/depsChecker/funcPluginTelemetry";
import { LinuxNotSupportedError } from "../../common/deps-checker/depsError";
import { InfoMessages } from "../../plugins/resource/function/resources/message";
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
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-function",
      telemetryEventName: "scaffold",
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
    const folder = inputs.folder || FunctionPluginPathInfo.solutionFolderName;
    const workingDir = path.join(inputs.projectPath, folder);
    const functionName = inputs[QuestionKey.functionName];
    const variables = {
      appName: appName,
      functionName: functionName,
    };
    actionContext?.progressBar?.next(ProgressMessages.scaffoldApi);
    await FunctionScaffold.scaffoldFunction(
      workingDir,
      language,
      DefaultValues.functionTriggerType,
      functionName,
      variables
    );
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingApi,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-function",
      telemetryEventName: "build",
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
    if (!language || !Object.values(FunctionLanguage).includes(language as FunctionLanguage))
      throw new invalidProjectSettings(ErrorMessage.programmingLanguageInvalid);
    const buildPath = path.resolve(inputs.projectPath, teamsApi.folder);

    await this.handleDotnetChecker(context, inputs);
    try {
      await FunctionDeploy.installFuncExtensions(buildPath, language as FunctionLanguage);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // wrap the original error to UserError so the extensibility model will pop-up a dialog correctly
        throw funcDepsHelper.transferError(error);
      } else {
        throw error;
      }
    }

    actionContext?.progressBar?.next(ProgressMessages.buildingApi);
    await FunctionDeploy.build(buildPath, language as FunctionLanguage);
    return ok(undefined);
  }

  private async handleDotnetChecker(ctx: ContextV3, inputs: InputsWithProjectPath): Promise<void> {
    Logger.setLogger(ctx.logProvider);
    TelemetryHelper.setContext(ctx);
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
        funcDepsLogger.error(InfoMessages.failedToInstallDotnet(error));
        await funcDepsLogger.printDetailLog();
        throw funcDepsHelper.transferError(error);
      } else {
        throw error;
      }
    } finally {
      funcDepsLogger.cleanup();
    }
  }
}
