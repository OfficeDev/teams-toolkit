// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ActionContext,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  LogProvider,
  ok,
  ResourceContextV3,
  Result,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import * as path from "path";
import * as fs from "fs-extra";
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
import {
  Constants,
  FrontendPathInfo,
  DependentPluginInfo,
  TelemetryEvent,
  Commands,
} from "../../plugins/resource/frontend/constants";
import { FrontendDeployment } from "../../plugins/resource/frontend/ops/deploy";
import {
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../../plugins/resource/frontend/resources/errors";
import { Messages } from "../../plugins/resource/frontend/resources/messages";
import { ComponentNames, ProgrammingLanguage } from "../constants";
import { getComponent } from "../workflow";
import { convertToLangKey, execute } from "./utils";
import {
  envFilePath,
  EnvKeys,
  loadEnvFile,
  saveEnvFile,
} from "../../plugins/resource/frontend/env";
import { isVSProject } from "../../common/projectSettingsHelper";
import { DotnetCommands } from "../../plugins/resource/frontend/dotnet/constants";
import { ScaffoldProgress } from "../../plugins/resource/frontend/resources/steps";
import { ProgressMessages, ProgressTitles } from "../messages";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import {
  M365SsoLaunchPageOptionItem,
  TabNonSsoItem,
  TabOptionItem,
} from "../../plugins/solution/fx-solution/question";
import { BadComponent } from "../error";
import { CommandExecutionError, TemplateZipFallbackError } from "./error";
import { AppSettingConstants, replaceBlazorAppSettings } from "./appSettingUtils";
import baseAppSettings from "./appSettings/baseAppSettings.json";
import ssoBlazorAppSettings from "./appSettings/ssoBlazorAppSettings.json";
/**
 * tab scaffold
 */
@Service("tab-code")
export class TabCodeProvider {
  name = "tab-code";
  @hooks([
    ActionExecutionMW({
      errorSource: "FE",
      enableProgressBar: true,
      progressTitle: ProgressTitles.scaffoldTab,
      progressSteps: Object.keys(ScaffoldProgress.steps).length,
    }),
  ])
  async generate(
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<string, FxError>> {
    inputs.folder =
      inputs.folder ||
      (inputs[CoreQuestionNames.ProgrammingLanguage] === ProgrammingLanguage.CSharp
        ? ""
        : FrontendPathInfo.WorkingDir);
    const langKey = convertToLangKey(inputs[CoreQuestionNames.ProgrammingLanguage]);
    const workingDir = path.join(inputs.projectPath, inputs.folder);
    inputs.safeProjectName =
      inputs.safeProjectName ?? convertToAlphanumericOnly(ctx.projectSetting.appName);
    const variables = {
      ProjectName: ctx.projectSetting.appName,
      SafeProjectName: inputs.safeProjectName,
    };

    const scenario = featureToScenario.get(inputs[CoreQuestionNames.Features]);
    await actionContext?.progressBar?.next(ProgressMessages.scaffoldTab);
    await scaffoldFromTemplates({
      group: "tab",
      lang: langKey,
      scenario: scenario,
      dst: workingDir,
      fileNameReplaceFn: (name: string, data: Buffer) =>
        name.replace(/ProjectName/, ctx.projectSetting.appName).replace(/\.tpl/, ""),
      fileDataReplaceFn: genTemplateRenderReplaceFn(variables),
      onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
        if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
          ctx.logProvider.info(Messages.getTemplateFrom(context.zipUrl ?? Constants.EmptyString));
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
            throw new TemplateZipFallbackError("FE");
          case ScaffoldActionName.Unzip:
            throw new UnzipTemplateError();
          default:
            throw new UnknownScaffoldError();
        }
      },
    });
    return ok(inputs.folder);
  }
  @hooks([
    ActionExecutionMW({
      errorSource: "FE",
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    const tabDir = teamsTab?.folder;
    // Non-sso tab do not need to be configured
    if (tabDir == undefined || !teamsTab?.sso) return ok(undefined);
    if (isVSProject(context.projectSetting) && context.envInfo.envName === "local") {
      const appSettingsPath = path.resolve(
        inputs.projectPath,
        tabDir,
        AppSettingConstants.DevelopmentFileName
      );
      let appSettings: string;
      if (!(await fs.pathExists(appSettingsPath))) {
        // if appsetting file not exist, generate a new one
        appSettings = JSON.stringify({ ...baseAppSettings, ...ssoBlazorAppSettings }, null, 2);
      } else {
        appSettings = await fs.readFile(appSettingsPath, "utf-8");
      }
      await fs.writeFile(appSettingsPath, replaceBlazorAppSettings(context, appSettings), "utf-8");
    } else if (context.envInfo.envName !== "local") {
      const envFile = envFilePath(context.envInfo.envName, path.join(inputs.projectPath, tabDir));
      const envs = this.collectEnvs(context);
      await saveEnvFile(envFile, { teamsfxRemoteEnvs: envs, customizedRemoteEnvs: {} });
    }
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.buildingTab,
      progressSteps: 1,
      errorSource: "FE",
    }),
  ])
  async build(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    const teamsTab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    if (!teamsTab) return ok(undefined);
    if (teamsTab.folder == undefined) throw new BadComponent("tab", this.name, "folder");
    await actionContext?.progressBar?.next(ProgressMessages.buildingTab);
    const tabPath = path.resolve(inputs.projectPath, teamsTab.folder);
    const artifactFolder = isVSProject(context.projectSetting)
      ? await this.doBlazorBuild(tabPath, context.logProvider)
      : await this.doReactBuild(
          tabPath,
          ctx.envInfo.envName,
          context.telemetryReporter,
          context.logProvider
        );
    merge(teamsTab, {
      build: true,
      artifactFolder: path.join(teamsTab.folder, artifactFolder),
    });
    return ok(undefined);
  }
  collectEnvs(ctx: ContextV3): { [key: string]: string } {
    const envs: { [key: string]: string } = {};
    const addToEnvs = (key: string, value: string | undefined) => {
      // Check for both null and undefined, add to envs when value is "", 0 or false.
      if (value != null) {
        envs[key] = value;
      }
    };

    const teamsTab = getComponent(ctx.projectSetting, ComponentNames.TeamsTab);
    const teamsApi = getComponent(ctx.projectSetting, ComponentNames.TeamsApi);
    if (teamsApi) {
      addToEnvs(EnvKeys.FuncName, teamsApi.functionNames[0]);
      addToEnvs(
        EnvKeys.FuncEndpoint,
        ctx.envInfo?.state?.[ComponentNames.TeamsApi]?.functionEndpoint as string
      );
    }
    if (teamsTab?.sso) {
      addToEnvs(EnvKeys.ClientID, ctx.envInfo?.state?.[ComponentNames.AadApp]?.clientId as string);
      addToEnvs(EnvKeys.StartLoginPage, DependentPluginInfo.StartLoginPageURL);
    }
    const simpleAuth = getComponent(ctx.projectSetting, ComponentNames.SimpleAuth);
    if (simpleAuth) {
      addToEnvs(
        EnvKeys.RuntimeEndpoint,
        ctx.envInfo?.state?.[ComponentNames.SimpleAuth]?.endpoint as string
      );
    }
    return envs;
  }
  private async doBlazorBuild(tabPath: string, logger?: LogProvider): Promise<string> {
    const command = DotnetCommands.buildRelease("win-x86");
    try {
      await execute(command, tabPath, logger);
    } catch (e) {
      throw new CommandExecutionError(command, tabPath, e);
    }
    return "publish";
  }
  private async doReactBuild(
    tabPath: string,
    envName: string,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ): Promise<string> {
    const needBuild = await FrontendDeployment.needBuild(tabPath, envName);
    if (!needBuild) {
      return "build";
    }

    const scripts =
      (await fs.readJSON(path.join(tabPath, FrontendPathInfo.NodePackageFile))).scripts ?? [];

    if (!("install:teamsfx" in scripts)) {
      // * Track legacy projects
      telemetryReporter?.sendTelemetryEvent(TelemetryEvent.InstallScriptNotFound);
    }

    await execute(
      "install:teamsfx" in scripts
        ? Commands.InstallNodePackages
        : Commands.DefaultInstallNodePackages,
      tabPath,
      logger
    );

    if ("build:teamsfx" in scripts && (await fs.pathExists(envFilePath(envName, tabPath)))) {
      await execute(Commands.BuildFrontend, tabPath, logger, {
        TEAMS_FX_ENV: envName,
      });
    } else {
      const envs = await loadEnvFile(envFilePath(envName, tabPath));
      await execute(Commands.DefaultBuildFrontend, tabPath, logger, {
        ...envs.customizedRemoteEnvs,
        ...envs.teamsfxRemoteEnvs,
      });
    }

    await FrontendDeployment.saveDeploymentInfo(tabPath, envName, {
      lastBuildTime: new Date().toISOString(),
    });
    return "build";
  }
}

enum Scenario {
  default = "default",
  nonSso = "non-sso",
  m365 = "m365",
}

const featureToScenario = new Map<string, Scenario>([
  [TabOptionItem.id, Scenario.default],
  [TabNonSsoItem.id, Scenario.nonSso],
  [M365SsoLaunchPageOptionItem.id, Scenario.m365],
]);
