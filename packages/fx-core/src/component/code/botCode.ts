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
import * as fs from "fs-extra";
import { merge } from "lodash";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import {
  genTemplateRenderReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../common/template-utils/templatesActions";
import { convertToLangKey } from "./utils";
import { convertToAlphanumericOnly } from "../../common/utils";
import { CoreQuestionNames } from "../../core/question";
import {
  DEFAULT_DOTNET_FRAMEWORK,
  TemplateProjectsConstants,
} from "../../plugins/resource/bot/constants";
import { CommandExecutionError } from "../../plugins/resource/bot/errors";
import { Commands, CommonStrings } from "../../plugins/resource/bot/resources/strings";
import * as utils from "../../plugins/resource/bot/utils/common";
import { telemetryHelper } from "../../plugins/resource/bot/utils/telemetry-helper";
import { TemplateZipFallbackError, UnzipError } from "../../plugins/resource/bot/v3/error";
import { ComponentNames, ProgrammingLanguage } from "../constants";
import { ProgressMessages, ProgressTitles } from "../messages";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { getComponent } from "../workflow";
import { BadComponent } from "../error";
/**
 * bot scaffold plugin
 */
@Service("bot-code")
export class BotCodeProvider {
  name = "bot-code";
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.scaffoldBot,
      progressSteps: 1,
      errorSource: "bot",
      errorHandler: (e, t) => {
        telemetryHelper.fillAppStudioErrorProperty(e, t);
        return e as FxError;
      },
    }),
  ])
  async generate(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const appName = projectSettings.appName;
    const language =
      inputs?.[CoreQuestionNames.ProgrammingLanguage] ||
      context.projectSetting.programmingLanguage ||
      ProgrammingLanguage.JS;
    const botFolder =
      inputs.folder ??
      (language === ProgrammingLanguage.CSharp ? "" : CommonStrings.BOT_WORKING_DIR_NAME);
    const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
    const lang = convertToLangKey(language);
    const workingDir = path.join(inputs.projectPath, botFolder);
    const safeProjectName =
      inputs[CoreQuestionNames.SafeProjectName] ?? convertToAlphanumericOnly(appName);

    await actionContext?.progressBar?.next(ProgressMessages.scaffoldBot);
    for (const scenario of inputs.scenarios as string[]) {
      await scaffoldFromTemplates({
        group: group_name,
        lang: lang,
        scenario: scenario,
        dst: workingDir,
        fileDataReplaceFn: genTemplateRenderReplaceFn({
          ProjectName: appName,
          SafeProjectName: safeProjectName,
        }),
        fileNameReplaceFn: (name: string, data: Buffer) =>
          name.replace(/ProjectName/, appName).replace(/\.tpl/, ""),
        onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
          switch (action.name) {
            case ScaffoldActionName.FetchTemplatesUrlWithTag:
            case ScaffoldActionName.FetchTemplatesZipFromUrl:
              break;
            case ScaffoldActionName.FetchTemplateZipFromLocal:
              throw new TemplateZipFallbackError();
            case ScaffoldActionName.Unzip:
              throw new UnzipError(context.dst);
            default:
              throw new Error(error.message);
          }
        },
      });
    }
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingBot,
      progressSteps: 1,
      errorSource: "bot",
    }),
  ])
  async build(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
    if (!teamsBot) return ok(undefined);
    if (teamsBot.folder == undefined) throw new BadComponent("bot", this.name, "folder");
    const packDir = path.resolve(inputs.projectPath, teamsBot.folder);
    const language = context.projectSetting.programmingLanguage || ProgrammingLanguage.JS;

    await actionContext?.progressBar?.next(ProgressMessages.buildingBot);
    if (language === ProgrammingLanguage.TS) {
      //Typescript needs tsc build before deploy because of windows app server. other languages don"t need it.
      try {
        await utils.execute("npm install", packDir);
        await utils.execute("npm run build", packDir);
        merge(teamsBot, { build: true, artifactFolder: teamsBot.folder });
      } catch (e) {
        throw new CommandExecutionError(
          `${Commands.NPM_INSTALL}, ${Commands.NPM_BUILD}`,
          packDir,
          e
        );
      }
    } else if (language === ProgrammingLanguage.JS) {
      try {
        // fail to npm install @microsoft/teamsfx on azure web app, so pack it locally.
        await utils.execute("npm install", packDir);
        merge(teamsBot, { build: true, artifactFolder: teamsBot.folder });
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL}`, packDir, e);
      }
    } else if (language === ProgrammingLanguage.CSharp) {
      const projectFileName = `${context.projectSetting.appName}.csproj`;
      const framework = await BotCodeProvider.getFrameworkVersion(
        path.join(packDir, projectFileName)
      );
      await utils.execute(`dotnet publish --configuration Release`, packDir);
      const artifactFolder = path.join(".", "bin", "Release", framework, "publish");
      merge(teamsBot, { build: true, artifactFolder: artifactFolder });
    }
    return ok(undefined);
  }

  /**
   * read dotnet framework version from project file
   * @param projectFilePath project base folder
   */
  private static async getFrameworkVersion(projectFilePath: string): Promise<string> {
    try {
      const reg = /(?<=<TargetFramework>)(.*)(?=<)/gim;
      const content = await fs.readFile(projectFilePath, "utf8");
      const framework = content.match(reg);
      if (framework?.length) {
        return framework[0].trim();
      }
    } catch {}
    return DEFAULT_DOTNET_FRAMEWORK;
  }
}
