// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as os from "os";
import {
  CryptoProvider,
  err,
  FxError,
  Inputs,
  Json,
  LogProvider,
  ok,
  Platform,
  Result,
  SolutionContext,
  TelemetryReporter,
  v2,
  Void,
  ProjectSettings,
} from "@microsoft/teamsfx-api";
import { LocalSettingsProvider } from "../../../../common/localSettingsProvider";
import { ProjectSettingsHelper } from "../../../../common/local/projectSettingsHelper";
import * as Launch from "./util/launch";
import * as Tasks from "./util/tasks";
import * as Settings from "./util/settings";
import { TelemetryEventName, TelemetryUtils } from "./util/telemetry";
import { ScaffoldLocalDebugSettingsError, ScaffoldLocalDebugSettingsV1Error } from "./error";

const PackageJson = require("@npmcli/package-json");

export async function scaffoldLocalDebugSettings(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings?: Json
): Promise<Result<Json, FxError>> {
  return await _scaffoldLocalDebugSettings(
    ctx.projectSetting,
    inputs,
    ctx.telemetryReporter,
    ctx.logProvider,
    ctx.cryptoProvider,
    localSettings
  );
}

export async function scaffoldLocalDebugSettingsV1(
  ctx: SolutionContext
): Promise<Result<Void, FxError>> {
  if (!ctx.projectSettings || !ctx.answers || !ctx.telemetryReporter || !ctx.logProvider) {
    return err(ScaffoldLocalDebugSettingsV1Error());
  }
  await _scaffoldLocalDebugSettings(
    ctx.projectSettings,
    ctx.answers,
    ctx.telemetryReporter,
    ctx.logProvider,
    ctx.cryptoProvider
  );
  return ok(Void);
}

export async function _scaffoldLocalDebugSettings(
  projectSetting: ProjectSettings,
  inputs: Inputs,
  telemetryReporter: TelemetryReporter,
  logProvider: LogProvider,
  cryptoProvider: CryptoProvider,
  localSettings?: Json
): Promise<Result<Json, FxError>> {
  const isSpfx = ProjectSettingsHelper.isSpfx(projectSetting);
  const isMigrateFromV1 = ProjectSettingsHelper.isMigrateFromV1(projectSetting);
  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSetting);
  const includeBackend = ProjectSettingsHelper.includeBackend(projectSetting);
  const includeBot = ProjectSettingsHelper.includeBot(projectSetting);
  const includeAAD = ProjectSettingsHelper.includeAAD(projectSetting);
  const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSetting);
  const programmingLanguage = projectSetting.programmingLanguage ?? "";

  const telemetryProperties = {
    platform: inputs.platform as string,
    spfx: isSpfx ? "true" : "false",
    frontend: includeFrontend ? "true" : "false",
    function: includeBackend ? "true" : "false",
    bot: includeBot ? "true" : "false",
    auth: includeAAD && includeSimpleAuth ? "true" : "false",
    "programming-language": programmingLanguage,
  };
  TelemetryUtils.init(telemetryReporter);
  TelemetryUtils.sendStartEvent(TelemetryEventName.scaffoldLocalDebugSettings, telemetryProperties);
  try {
    // scaffold for both vscode and cli
    if (inputs.platform === Platform.VSCode || inputs.platform === Platform.CLI) {
      if (isSpfx) {
        // Only generate launch.json and tasks.json for SPFX
        const launchConfigurations = Launch.generateSpfxConfigurations();
        const launchCompounds = Launch.generateSpfxCompounds();
        const tasks = Tasks.generateSpfxTasks();
        const tasksInputs = Tasks.generateInputs();

        //TODO: save files via context api
        await fs.ensureDir(`${inputs.projectPath}/.vscode/`);
        await fs.writeJSON(
          `${inputs.projectPath}/.vscode/launch.json`,
          {
            version: "0.2.0",
            configurations: launchConfigurations,
            compounds: launchCompounds,
          },
          {
            spaces: 4,
            EOL: os.EOL,
          }
        );

        await fs.writeJSON(
          `${inputs.projectPath}/.vscode/tasks.json`,
          {
            version: "2.0.0",
            tasks: tasks,
            inputs: tasksInputs,
          },
          {
            spaces: 4,
            EOL: os.EOL,
          }
        );

        await fs.writeJSON(
          `${inputs.projectPath}/.vscode/settings.json`,
          Settings.generateSettings(false),
          {
            spaces: 4,
            EOL: os.EOL,
          }
        );
      } else {
        const launchConfigurations = Launch.generateConfigurations(
          includeFrontend,
          includeBackend,
          includeBot,
          isMigrateFromV1
        );
        const launchCompounds = Launch.generateCompounds(
          includeFrontend,
          includeBackend,
          includeBot
        );

        const tasks = Tasks.generateTasks(
          includeFrontend,
          includeBackend,
          includeBot,
          includeSimpleAuth,
          isMigrateFromV1,
          programmingLanguage
        );

        //TODO: save files via context api
        await fs.ensureDir(`${inputs.projectPath}/.vscode/`);
        await fs.writeJSON(
          `${inputs.projectPath}/.vscode/launch.json`,
          {
            version: "0.2.0",
            configurations: launchConfigurations,
            compounds: launchCompounds,
          },
          {
            spaces: 4,
            EOL: os.EOL,
          }
        );

        await fs.writeJSON(
          `${inputs.projectPath}/.vscode/tasks.json`,
          {
            version: "2.0.0",
            tasks: tasks,
          },
          {
            spaces: 4,
            EOL: os.EOL,
          }
        );

        // generate localSettings.json

        localSettings = await scaffoldLocalSettingsJson(
          projectSetting,
          inputs,
          cryptoProvider,
          localSettings
        );

        // add 'npm install' scripts into root package.json
        const packageJsonPath = inputs.projectPath;
        let packageJson: any = undefined;
        try {
          packageJson = await PackageJson.load(packageJsonPath);
        } catch (error) {
          logProvider.error(`Cannot load package.json from ${inputs.projectPath}. ${error}`);
        }

        if (packageJson !== undefined) {
          const scripts = packageJson.content.scripts ?? {};
          const installAll: string[] = [];

          if (includeBackend) {
            scripts["install:api"] = "cd api && npm install";
            installAll.push("npm run install:api");
          }
          if (includeBot) {
            scripts["install:bot"] = "cd bot && npm install";
            installAll.push("npm run install:bot");
          }
          if (includeFrontend) {
            scripts["install:tabs"] = "cd tabs && npm install";
            installAll.push("npm run install:tabs");
          }

          scripts["installAll"] = installAll.join(" & ");

          packageJson.update({ scripts: scripts });
          await packageJson.save();
        }
      }

      await fs.writeJSON(
        `${inputs.projectPath}/.vscode/settings.json`,
        Settings.generateSettings(includeBackend),
        {
          spaces: 4,
          EOL: os.EOL,
        }
      );
    }
  } catch (error: any) {
    const systemError = ScaffoldLocalDebugSettingsError(error);
    TelemetryUtils.sendErrorEvent(TelemetryEventName.scaffoldLocalDebugSettings, systemError);
    return err(systemError);
  }

  TelemetryUtils.sendSuccessEvent(
    TelemetryEventName.scaffoldLocalDebugSettings,
    telemetryProperties
  );
  return ok(localSettings as Json);
}

async function scaffoldLocalSettingsJson(
  projectSetting: ProjectSettings,
  inputs: Inputs,
  cryptoProvider: CryptoProvider,
  localSettings?: Json
): Promise<Json> {
  const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath!);

  const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSetting);
  const includeBackend = ProjectSettingsHelper.includeBackend(projectSetting);
  const includeBot = ProjectSettingsHelper.includeBot(projectSetting);

  if (localSettings !== undefined) {
    // Add local settings for the new added capability/resource
    localSettings = localSettingsProvider.incrementalInitV2(
      localSettings,
      includeBackend,
      includeBot,
      includeFrontend
    );
    await localSettingsProvider.saveJson(localSettings, cryptoProvider);
  } else {
    // Initialize a local settings on scaffolding
    localSettings = localSettingsProvider.initV2(includeFrontend, includeBackend, includeBot);
    await localSettingsProvider.saveJson(localSettings, cryptoProvider);
  }
  return localSettings;
}
