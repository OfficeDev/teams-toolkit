// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import path from "path";
import { TemplateZipFallbackError, UnzipError } from "../error";
import {
  genTemplateRenderReplaceFn,
  removeTemplateExtReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../common/template-utils/templatesActions";
import { ProgrammingLanguage } from "../../constants";
import { invalidProjectSettings } from "../../error";
import { ErrorMessage, LogMessages } from "../../messages";
import { LogProvider } from "@microsoft/teamsfx-api";
import { ApiConstants, ReplaceTemplateFileNamePlaceholder, TemplateGroup } from "../constants";
import { LanguageStrategyFactory } from "./language-strategy";

export type TemplateVariables = { [key: string]: string };

export class FunctionScaffold {
  public static convertTemplateLanguage(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.JS:
        return "js";
      case ProgrammingLanguage.TS:
        return "ts";
      default:
        throw new invalidProjectSettings(ErrorMessage.programmingLanguageInvalid);
    }
  }

  public static async doesFunctionPathExist(
    componentPath: string,
    language: ProgrammingLanguage,
    entryName: string
  ): Promise<boolean> {
    const entryFileOrFolderName: string =
      LanguageStrategyFactory.getStrategy(language).getFunctionEntryFileOrFolderName(entryName);
    return fs.pathExists(path.join(componentPath, entryFileOrFolderName));
  }

  private static async scaffoldFromZipPackage(
    componentPath: string,
    group: string,
    language: ProgrammingLanguage,
    scenario: string,
    variables: TemplateVariables,
    nameReplaceFn?: (filePath: string, data: Buffer) => string,
    logger?: LogProvider
  ): Promise<void> {
    const _nameReplaceFn = (name: string, data: Buffer) => {
      name = nameReplaceFn ? nameReplaceFn(name, data) : name;
      return removeTemplateExtReplaceFn(name, data);
    };

    await scaffoldFromTemplates({
      group: group,
      lang: this.convertTemplateLanguage(language),
      scenario: scenario,
      dst: componentPath,
      fileNameReplaceFn: _nameReplaceFn,
      fileDataReplaceFn: genTemplateRenderReplaceFn(variables),
      onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
        if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
          logger?.info(LogMessages.getTemplateFrom(context.zipUrl ?? ""));
        }
      },
      onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
        logger?.info(error.toString());
        switch (action.name) {
          case ScaffoldActionName.FetchTemplatesUrlWithTag:
          case ScaffoldActionName.FetchTemplatesZipFromUrl:
            logger?.info(LogMessages.getTemplateFromLocal);
            break;
          case ScaffoldActionName.FetchTemplateZipFromLocal:
            throw new TemplateZipFallbackError("BE");
          case ScaffoldActionName.Unzip:
            throw new UnzipError("BE");
          default:
            throw new Error(error.message);
        }
      },
    });
  }

  public static async scaffoldFunction(
    componentPath: string,
    language: ProgrammingLanguage,
    trigger: string,
    entryName: string,
    variables: TemplateVariables,
    logger?: LogProvider
  ): Promise<void> {
    await this.ensureFunctionAppProject(componentPath, language, variables, logger);
    await this.scaffoldFromZipPackage(
      componentPath,
      TemplateGroup.apiTriggers,
      language,
      trigger,
      variables,
      (name: string) => name.replace(ReplaceTemplateFileNamePlaceholder, entryName)
    );
  }

  /*
   * Always call ensure project before scaffold a function entry.
   */
  private static async ensureFunctionAppProject(
    componentPath: string,
    language: ProgrammingLanguage,
    variables: TemplateVariables,
    logger?: LogProvider
  ): Promise<void> {
    const exists = await fs.pathExists(componentPath);
    if (exists) {
      logger?.info(LogMessages.projectScaffoldAt(componentPath));
      return;
    }

    await this.scaffoldFromZipPackage(
      componentPath,
      TemplateGroup.apiBase,
      language,
      ApiConstants.baseScenarioName,
      variables
    );
  }
}
