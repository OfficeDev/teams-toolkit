// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  Result,
  SourceCodeProvider,
} from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import {
  genTemplateRenderReplaceFn,
  removeTemplateExtReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../common/template-utils/templatesActions";
import { ProgrammingLanguage } from "../../plugins/resource/bot/enums/programmingLanguage";
import { CommandExecutionError } from "../../plugins/resource/bot/errors";
import { Commands } from "../../plugins/resource/bot/resources/strings";
import * as utils from "../../plugins/resource/bot/utils/common";
import { TemplateZipFallbackError } from "../../plugins/resource/bot/v3/error";
import { Constants, FrontendPathInfo } from "../../plugins/resource/frontend/constants";
import {
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../../plugins/resource/frontend/resources/errors";
import { Messages } from "../../plugins/resource/frontend/resources/messages";
import { Scenario, TemplateInfo } from "../../plugins/resource/frontend/resources/templateInfo";
import { ComponentNames } from "../constants";
import { getComponent } from "../workflow";
import { convertToLangKey } from "./botCode";
/**
 * tab scaffold
 */
@Service("tab-code")
export class TabCodeProvider implements SourceCodeProvider {
  name = "tab-code";
  generate(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "tab-code.generate",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
        if (!teamsTab) return ok([]);
        const language =
          inputs?.["programming-language"] ||
          context.projectSetting.programmingLanguage ||
          "javascript";
        const folder = inputs.folder || language === "csharp" ? "" : FrontendPathInfo.WorkingDir;
        return ok([`scaffold tab source code in folder: ${path.join(inputs.projectPath, folder)}`]);
      },
      execute: async (ctx: ContextV3, inputs: InputsWithProjectPath) => {
        const projectSettings = ctx.projectSetting as ProjectSettingsV3;
        const language =
          inputs?.["programming-language"] ||
          context.projectSetting.programmingLanguage ||
          "javascript";
        const folder = inputs.folder || language === "csharp" ? "" : FrontendPathInfo.WorkingDir;
        const teamsBot = getComponent(projectSettings, ComponentNames.TeamsBot);
        if (!teamsBot) return ok([]);
        merge(teamsBot, { build: true, folder: folder });
        const langKey = convertToLangKey(language);
        const workingDir = path.join(inputs.projectPath, folder);
        const hasFunction = false; //TODO
        const variables = {
          showFunction: hasFunction.toString(),
        };
        await scaffoldFromTemplates({
          group: TemplateInfo.TemplateGroupName,
          lang: langKey,
          scenario: Scenario.Default,
          dst: workingDir,
          fileNameReplaceFn: removeTemplateExtReplaceFn,
          fileDataReplaceFn: genTemplateRenderReplaceFn(variables),
          onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
            if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
              ctx.logProvider.info(
                Messages.getTemplateFrom(context.zipUrl ?? Constants.EmptyString)
              );
            }
          },
          onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
            ctx.logProvider.info(error.toString());
            switch (action.name) {
              case ScaffoldActionName.FetchTemplatesUrlWithTag:
              case ScaffoldActionName.FetchTemplatesZipFromUrl:
                ctx.logProvider.info(Messages.FailedFetchTemplate);
                break;
              case ScaffoldActionName.FetchTemplateZipFromLocal:
                throw new TemplateZipFallbackError();
              case ScaffoldActionName.Unzip:
                throw new UnzipTemplateError();
              default:
                throw new UnknownScaffoldError();
            }
          },
        });
        return ok([`scaffold tab source code in folder: ${workingDir}`]);
      },
    };
    return ok(action);
  }
  build(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "tab-code.build",
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
