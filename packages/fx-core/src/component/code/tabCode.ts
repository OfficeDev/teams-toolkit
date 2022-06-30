// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  Effect,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  ProvisionContextV3,
  Result,
  SourceCodeProvider,
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
import { convertToAlphanumericOnly } from "../../common/utils";
import { CoreQuestionNames } from "../../core/question";
import { TemplateZipFallbackError } from "../../plugins/resource/bot/v3/error";
import {
  Constants,
  FrontendPathInfo,
  DependentPluginInfo,
} from "../../plugins/resource/frontend/constants";
import { FrontendDeployment } from "../../plugins/resource/frontend/ops/deploy";
import {
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../../plugins/resource/frontend/resources/errors";
import { Messages } from "../../plugins/resource/frontend/resources/messages";
import { Scenario, TemplateInfo } from "../../plugins/resource/frontend/resources/templateInfo";
import { ComponentNames } from "../constants";
import { getComponent } from "../workflow";
import { convertToLangKey } from "./botCode";
import { envFilePath, EnvKeys, saveEnvFile } from "../../plugins/resource/frontend/env";
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
        const appName = projectSettings.appName;
        const language =
          inputs?.["programming-language"] ||
          context.projectSetting.programmingLanguage ||
          "javascript";
        const folder = inputs.folder || language === "csharp" ? "" : FrontendPathInfo.WorkingDir;
        const teamsTab = getComponent(projectSettings, ComponentNames.TeamsTab);
        if (!teamsTab) return ok([]);
        merge(teamsTab, { build: true, provisionconfigure: true, folder: folder });
        const langKey = convertToLangKey(language);
        const workingDir = path.join(inputs.projectPath, folder);
        const hasFunction = false; //TODO
        const safeProjectName =
          inputs[CoreQuestionNames.SafeProjectName] ?? convertToAlphanumericOnly(appName);
        const variables = {
          showFunction: hasFunction.toString(),
          ProjectName: appName,
          SafeProjectName: safeProjectName,
        };
        await scaffoldFromTemplates({
          group: TemplateInfo.TemplateGroupName,
          lang: langKey,
          scenario: Scenario.Default,
          dst: workingDir,
          fileNameReplaceFn: (name: string, data: Buffer) =>
            name.replace(/ProjectName/, appName).replace(/\.tpl/, ""),
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
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "tab-code.configure",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
        if (!teamsTab) return ok([]);
        const tabDir = teamsTab?.folder;
        if (!tabDir || !inputs.env) return ok([]);
        return ok([
          {
            type: "file",
            filePath: envFilePath(inputs.env, path.join(inputs.projectPath, tabDir)),
            operate: "create",
          },
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<Effect[], FxError>> => {
        const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
        const tabDir = teamsTab?.folder;
        if (!tabDir || !inputs.env) return ok([]);
        const envFile = envFilePath(inputs.env, path.join(inputs.projectPath, tabDir));
        const envs = this.collectEnvs(context);
        await saveEnvFile(envFile, { teamsfxRemoteEnvs: envs, customizedRemoteEnvs: {} });

        return ok([
          {
            type: "file",
            filePath: envFile,
            operate: "create",
          },
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
      name: "tab-code.build",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
        if (!teamsTab) return ok([]);
        const tabDir = teamsTab?.folder;
        if (!tabDir) return ok([]);
        return ok([`build project: ${tabDir}`]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
        if (!teamsTab) return ok([]);
        const tabDir = path.join(inputs.projectPath, teamsTab.folder!);
        await FrontendDeployment.doFrontendBuildV3(tabDir, ctx.envInfo.envName);
        return ok([`build project: ${tabDir}`]);
      },
    };
    return ok(action);
  }
  private collectEnvs(ctx: ContextV3): { [key: string]: string } {
    const envs: { [key: string]: string } = {};
    const addToEnvs = (key: string, value: string | undefined) => {
      // Check for both null and undefined, add to envs when value is "", 0 or false.
      if (value != null) {
        envs[key] = value;
      }
    };

    // TODO: add environemnt variables for aad, simple auth and function api
    addToEnvs(EnvKeys.StartLoginPage, DependentPluginInfo.StartLoginPageURL);
    return envs;
  }
}
