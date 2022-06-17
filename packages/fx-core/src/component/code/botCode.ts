// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  ContextV3,
  MaybePromise,
  ProjectSettingsV3,
  SourceCodeProvider,
  InputsWithProjectPath,
} from "@microsoft/teamsfx-api";
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
import { TemplateProjectsConstants } from "../../plugins/resource/bot/constants";
import { ProgrammingLanguage } from "../../plugins/resource/bot/enums/programmingLanguage";
import { Commands, CommonStrings } from "../../plugins/resource/bot/resources/strings";
import { TemplateZipFallbackError, UnzipError } from "../../plugins/resource/bot/v3/error";
import { ComponentNames } from "../constants";
import { getComponent } from "../workflow";
import * as utils from "../../plugins/resource/bot/utils/common";
import { CommandExecutionError } from "../../plugins/resource/bot/errors";
/**
 * bot scaffold plugin
 */
@Service("bot-code")
export class BotCodeProvider implements SourceCodeProvider {
  name = "bot-code";
  generate(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-code.generate",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
        if (!teamsBot) return ok([]);
        const folder = inputs.folder || CommonStrings.BOT_WORKING_DIR_NAME;
        return ok([
          "add component 'bot-code' in projectSettings",
          `scaffold bot source code in folder: ${path.join(inputs.projectPath, folder)}`,
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const appName = projectSettings.appName;
        const language =
          inputs?.["programming-language"] ||
          context.projectSetting.programmingLanguage ||
          "javascript";
        const botFolder =
          inputs.folder || language === "csharp" ? "" : CommonStrings.BOT_WORKING_DIR_NAME;
        const teamsBot = getComponent(projectSettings, ComponentNames.TeamsBot);
        if (!teamsBot) return ok([]);
        merge(teamsBot, { build: true, folder: botFolder });
        const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
        const lang = convertToLangKey(language);
        const workingDir = path.join(inputs.projectPath, botFolder);
        for (const scenario of inputs.scenarios as string[]) {
          await scaffoldFromTemplates({
            group: group_name,
            lang: lang,
            scenario: scenario,
            dst: workingDir,
            fileDataReplaceFn: genTemplateRenderReplaceFn({ ProjectName: appName }),
            fileNameReplaceFn: (name: string, data: Buffer) =>
              name.replace(/ProjectName/, appName).replace(/\.tpl/, ""),
            onActionError: async (
              action: ScaffoldAction,
              context: ScaffoldContext,
              error: Error
            ) => {
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
        return ok([
          `scaffold bot source code in folder: ${path.join(inputs.projectPath, botFolder)}`,
        ]);
      },
    };
    return ok(action);
  }
  build(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-code.build",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
        if (!teamsBot) return ok([]);
        const packDir = teamsBot?.folder;
        if (!packDir) return ok([]);
        return ok([`build project: ${packDir}`]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
        if (!teamsBot) return ok([]);
        const packDir = path.join(inputs.projectPath, teamsBot.folder!);
        const language = context.projectSetting.programmingLanguage || "javascript";
        if (language === ProgrammingLanguage.TypeScript) {
          //Typescript needs tsc build before deploy because of windows app server. other languages don"t need it.
          try {
            await utils.execute("npm install", packDir);
            await utils.execute("npm run build", packDir);
          } catch (e) {
            throw new CommandExecutionError(
              `${Commands.NPM_INSTALL}, ${Commands.NPM_BUILD}`,
              packDir,
              e
            );
          }
        } else if (language === ProgrammingLanguage.JavaScript) {
          try {
            // fail to npm install @microsoft/teamsfx on azure web app, so pack it locally.
            await utils.execute("npm install", packDir);
          } catch (e) {
            throw new CommandExecutionError(`${Commands.NPM_INSTALL}`, packDir, e);
          }
        } else if (language === ProgrammingLanguage.Csharp) {
          //TODO for dotnet
        }
        return ok([`build project: ${packDir}`]);
      },
    };
    return ok(action);
  }
}

export function convertToLangKey(programmingLanguage: string): string {
  switch (programmingLanguage) {
    case "javascript": {
      return "js";
    }
    case "typescript": {
      return "ts";
    }
    case "csharp": {
      return "csharp";
    }
    default: {
      return "js";
    }
  }
}
