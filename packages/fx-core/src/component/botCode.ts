// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  v2,
  Action,
  ContextV3,
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  Component,
  SourceCodeProvider,
  InputsWithProjectPath,
} from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import {
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../common/template-utils/templatesActions";
import { TemplateProjectsConstants } from "../plugins/resource/bot/constants";
import { CommonStrings } from "../plugins/resource/bot/resources/strings";
import { TemplateZipFallbackError, UnzipError } from "../plugins/resource/bot/v3/error";
import { ComponentNames } from "./constants";
import { getComponent } from "./workflow";

/**
 * bot scaffold plugin
 */
@Service("bot-code")
export class BotCodeProvider implements SourceCodeProvider {
  readonly type = "code";
  name = "bot-code";
  generate(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-code.generate",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const folder = inputs.folder || CommonStrings.BOT_WORKING_DIR_NAME;
        return ok([
          "add component 'bot-code' in projectSettings",
          `scaffold bot source code in folder: ${path.join(inputs.projectPath, folder)}`,
        ]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const language =
          inputs.language || context.projectSetting.programmingLanguage || "javascript";
        const botFolder = inputs.folder || CommonStrings.BOT_WORKING_DIR_NAME;
        const teamsBot = getComponent(projectSettings, ComponentNames.TeamsBot);
        merge(teamsBot, { build: true, language: language, folder: botFolder });
        const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
        const lang = convertToLangKey(language);
        const workingDir = path.join(inputs.projectPath, botFolder);
        for (const scenario of inputs.scenarios as string[]) {
          await scaffoldFromTemplates({
            group: group_name,
            lang: lang,
            scenario: scenario,
            dst: workingDir,
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
    context: v2.Context,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const component = getComponent(context.projectSetting as ProjectSettingsV3, "bot-code");
    if (component) {
      const language = component.language || context.projectSetting.programmingLanguage;
      if (language === "typescript") {
        const group: GroupAction = {
          type: "group",
          name: "bot-code.build",
          actions: [
            {
              type: "shell",
              command: "npm install",
              description: `npm install (${path.resolve(inputs.projectPath, "bot")})`,
              cwd: path.resolve(inputs.projectPath, "bot"),
            },
            {
              type: "shell",
              command: "npm run build",
              description: `npm run build (${path.resolve(inputs.projectPath, "bot")})`,
              cwd: path.resolve(inputs.projectPath, "bot"),
            },
          ],
        };
        return ok(group);
      } else if (language === "csharp") {
        return ok({
          type: "shell",
          name: "bot-code.build",
          command: "MsBuild",
          description: `MsBuild (${path.resolve(inputs.projectPath, "bot")})`,
          cwd: path.resolve(inputs.projectPath, "bot"),
        });
      } else return ok(undefined);
    }
    return ok(undefined);
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
    default: {
      return "js";
    }
  }
}
