// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";

import {
  CommonConstants,
  FunctionPluginPathInfo as PathInfo,
  FunctionPluginInfo as PluginInfo,
  RegularExpr,
} from "../constants";
import { FunctionLanguage } from "../enums";
import { InfoMessages } from "../resources/message";
import { LanguageStrategyFactory } from "../language-strategy";
import { Logger } from "../utils/logger";
import { ScaffoldSteps, StepGroup, step } from "../resources/steps";
import { TemplateZipFallbackError, UnknownFallbackError, UnzipError } from "../resources/errors";
import { TelemetryHelper } from "../utils/telemetry-helper";
import {
  genTemplateRenderReplaceFn,
  removeTemplateExtReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../common/template-utils/templatesActions";

export type TemplateVariables = { [key: string]: string };

export class FunctionScaffold {
  public static convertTemplateLanguage(language: FunctionLanguage): string {
    switch (language) {
      case FunctionLanguage.JavaScript:
        return "js";
      case FunctionLanguage.TypeScript:
        return "ts";
    }
  }

  public static async doesFunctionPathExist(
    componentPath: string,
    language: FunctionLanguage,
    entryName: string
  ): Promise<boolean> {
    const entryFileOrFolderName: string =
      LanguageStrategyFactory.getStrategy(language).getFunctionEntryFileOrFolderName(entryName);
    return fs.pathExists(path.join(componentPath, entryFileOrFolderName));
  }

  private static async scaffoldFromZipPackage(
    componentPath: string,
    group: string,
    language: FunctionLanguage,
    scenario: string,
    variables: TemplateVariables,
    nameReplaceFn?: (filePath: string, data: Buffer) => string
  ): Promise<void> {
    const _nameReplaceFn = (name: string, data: Buffer) => {
      name = nameReplaceFn ? nameReplaceFn(name, data) : name;
      return removeTemplateExtReplaceFn(name, data);
    };

    await scaffoldFromTemplates({
      group: group,
      lang: this.convertTemplateLanguage(language),
      scenario: scenario,
      templatesFolderName: PathInfo.templateFolderName,
      dst: componentPath,
      fileNameReplaceFn: _nameReplaceFn,
      fileDataReplaceFn: genTemplateRenderReplaceFn(variables),
      onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
        if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
          Logger.info(InfoMessages.getTemplateFrom(context.zipUrl ?? CommonConstants.emptyString));
        }
      },
      onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
        Logger.info(error.toString());
        switch (action.name) {
          case ScaffoldActionName.FetchTemplatesUrlWithTag:
          case ScaffoldActionName.FetchTemplatesZipFromUrl:
            TelemetryHelper.sendScaffoldFallbackEvent(error.message);
            Logger.info(InfoMessages.getTemplateFromLocal);
            break;
          case ScaffoldActionName.FetchTemplateZipFromLocal:
            throw new TemplateZipFallbackError();
          case ScaffoldActionName.Unzip:
            throw new UnzipError();
          default:
            throw new UnknownFallbackError();
        }
      },
    });
  }

  public static async scaffoldFunction(
    componentPath: string,
    language: FunctionLanguage,
    trigger: string,
    entryName: string,
    variables: TemplateVariables
  ): Promise<void> {
    await step(
      StepGroup.ScaffoldStepGroup,
      ScaffoldSteps.ensureFunctionAppProject,
      async () => await this.ensureFunctionAppProject(componentPath, language, variables)
    );

    await step(
      StepGroup.ScaffoldStepGroup,
      ScaffoldSteps.scaffoldFunction,
      async () =>
        await this.scaffoldFromZipPackage(
          componentPath,
          PluginInfo.templateTriggerGroupName,
          language,
          trigger,
          variables,
          (name: string) => name.replace(RegularExpr.replaceTemplateFileNamePlaceholder, entryName)
        )
    );
  }

  /*
   * Always call ensure project before scaffold a function entry.
   */
  private static async ensureFunctionAppProject(
    componentPath: string,
    language: FunctionLanguage,
    variables: TemplateVariables
  ): Promise<void> {
    const exists = await fs.pathExists(componentPath);
    if (exists) {
      Logger.info(InfoMessages.projectScaffoldAt(componentPath));
      return;
    }

    await this.scaffoldFromZipPackage(
      componentPath,
      PluginInfo.templateBaseGroupName,
      language,
      PluginInfo.templateBaseScenarioName,
      variables
    );
  }
}
