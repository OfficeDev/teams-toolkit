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
  ResourceContextV3,
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
import { convertToLangKey, execute } from "./utils";
import { convertToAlphanumericOnly } from "../../common/utils";
import { CoreQuestionNames } from "../../core/question";
import {
  DEFAULT_DOTNET_FRAMEWORK,
  TemplateProjectsConstants,
} from "../../plugins/resource/bot/constants";
import { CommandExecutionError } from "../../plugins/resource/bot/errors";
import { Commands, CommonStrings } from "../../plugins/resource/bot/resources/strings";
import { telemetryHelper } from "../../plugins/resource/bot/utils/telemetry-helper";
import { TemplateZipFallbackError, UnzipError } from "../../plugins/resource/bot/v3/error";
import { ComponentNames, ProgrammingLanguage } from "../constants";
import { ProgressMessages, ProgressTitles } from "../messages";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { getComponent } from "../workflow";
import { BadComponent } from "../error";
import { isVSProject } from "../../common/projectSettingsHelper";
import { AppSettingConstants, replaceBotAppSettings } from "./appSettingUtils";
import baseAppSettings from "./appSettings/baseAppSettings.json";
import botAppSettings from "./appSettings/botAppSettings.json";
import ssoBotAppSettings from "./appSettings/ssoBotAppSettings.json";
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
      errorSource: "BT",
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
      errorSource: "BT",
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    if (!isVSProject(context.projectSetting) || context.envInfo.envName !== "local") {
      return ok(undefined);
    }
    const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
    const botDir = teamsBot?.folder;
    if (botDir == undefined) return ok(undefined);
    const appSettingsPath = path.resolve(
      inputs.projectPath,
      botDir,
      AppSettingConstants.DevelopmentFileName
    );
    let appSettings: string;
    if (!(await fs.pathExists(appSettingsPath))) {
      // if appsetting file not exist, generate a new one
      let appSettingsJson =
        teamsBot?.hosting === ComponentNames.Function
          ? botAppSettings
          : { ...baseAppSettings, ...botAppSettings };
      appSettingsJson = teamsBot?.sso
        ? { ...appSettingsJson, ...ssoBotAppSettings }
        : appSettingsJson;
      appSettings = JSON.stringify(appSettingsJson, null, 2);
    } else {
      appSettings = await fs.readFile(appSettingsPath, "utf-8");
    }
    await fs.writeFile(
      appSettingsPath,
      replaceBotAppSettings(context, appSettings, teamsBot?.sso),
      "utf-8"
    );
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingBot,
      progressSteps: 1,
      errorSource: "BT",
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
        await execute("npm install", packDir, context.logProvider);
        await execute("npm run build", packDir, context.logProvider);
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
        await execute("npm install", packDir, context.logProvider);
        merge(teamsBot, { build: true, artifactFolder: teamsBot.folder });
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL}`, packDir, e);
      }
    } else if (language === ProgrammingLanguage.CSharp) {
      const projectFileName = `${context.projectSetting.appName}.csproj`;
      const framework = await BotCodeProvider.getFrameworkVersion(
        path.join(packDir, projectFileName)
      );
      await execute(`dotnet publish --configuration Release`, packDir, context.logProvider);
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
