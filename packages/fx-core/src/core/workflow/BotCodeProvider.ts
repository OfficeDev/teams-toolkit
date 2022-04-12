// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import {
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../common/template-utils/templatesActions";
import { TemplateProjectsConstants } from "../../plugins/resource/bot/constants";
import { CommonStrings } from "../../plugins/resource/bot/resources/strings";
import { TemplateZipFallbackError, UnzipError } from "../../plugins/resource/bot/v3/error";
import {
  Action,
  ContextV3,
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  Component,
  SourceCodeProvider,
  TeamsBotInputs,
} from "./interface";
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
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-code.generate",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
        const folder = teamsBotInputs.folder || CommonStrings.BOT_WORKING_DIR_NAME;
        return ok([
          "add component 'bot-code' in projectSettings",
          `scaffold bot source code in folder: ${path.join(inputs.projectPath, folder)}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const projectSettings = context.projectSetting as ProjectSettingsV3;
        const teamsBotInputs = (inputs as TeamsBotInputs)["teams-bot"];
        const language =
          teamsBotInputs.language || context.projectSetting.programmingLanguage || "javascript";
        const folder = teamsBotInputs.folder || CommonStrings.BOT_WORKING_DIR_NAME;
        const component: Component = {
          name: "bot-code",
          ...teamsBotInputs,
          build: true,
          language: language,
          folder: folder,
        };
        projectSettings.components.push(component);
        const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
        const lang = convertToLangKey(language);
        const workingDir = path.join(inputs.projectPath, folder);
        await scaffoldFromTemplates({
          group: group_name,
          lang: lang,
          scenario: teamsBotInputs.scenario,
          dst: workingDir,
          onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {},
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
        return ok(undefined);
      },
    };
    return ok(action);
  }
  build(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
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
