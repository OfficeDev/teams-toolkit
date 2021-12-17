// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as os from "os";
import {
  err,
  FxError,
  Inputs,
  Json,
  LocalSettings,
  ok,
  Platform,
  Result,
  returnSystemError,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import { LocalSettingsProvider } from "../../../../common/localSettingsProvider";
import { ProjectSettingLoader } from "../../../../core/common/local/projectSettingLoader";
import * as Launch from "./util/launch";
import * as Tasks from "./util/tasks";
import * as Settings from "./util/settings";
import { TelemetryEventName, TelemetryUtils } from "./util/telemetry";
import { SolutionSource } from "../constants";
import { DebugError } from "./error";

const PackageJson = require("@npmcli/package-json");

export async function scaffoldLocalDebugSettings(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings?: LocalSettings | Json
): Promise<Result<Void, FxError>> {
  const isSpfx = ProjectSettingLoader.isSpfx(ctx);
  const isMigrateFromV1 = ProjectSettingLoader.isMigrateFromV1(ctx);
  const includeFrontend = ProjectSettingLoader.includeFrontend(ctx);
  const includeBackend = ProjectSettingLoader.includeBackend(ctx);
  const includeBot = ProjectSettingLoader.includeBot(ctx);
  const includeAuth = ProjectSettingLoader.includeAuth(ctx);
  const programmingLanguage = ctx.projectSetting?.programmingLanguage ?? "";

  const telemetryProperties = {
    platform: inputs.platform as string,
    spfx: isSpfx ? "true" : "false",
    frontend: includeFrontend ? "true" : "false",
    function: includeBackend ? "true" : "false",
    bot: includeBot ? "true" : "false",
    auth: includeAuth ? "true" : "false",
    "programming-language": programmingLanguage,
  };
  TelemetryUtils.init(ctx);
  TelemetryUtils.sendStartEvent(TelemetryEventName.scaffoldLocalDebugSettings, telemetryProperties);
  try {
    // scaffold for both vscode and cli
    if (inputs?.platform === Platform.VSCode || inputs?.platform === Platform.CLI) {
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
          includeAuth,
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
        await scaffoldLocalSettingsJson(ctx, inputs, localSettings);

        // add 'npm install' scripts into root package.json
        const packageJsonPath = inputs.projectPath;
        let packageJson: any = undefined;
        try {
          packageJson = await PackageJson.load(packageJsonPath);
        } catch (error) {
          ctx.logProvider?.error(`Cannot load package.json from ${inputs.projectPath}. ${error}`);
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
    const systemError = returnSystemError(
      error,
      SolutionSource,
      DebugError.ScaffoldLocalDebugSettingsError
    );
    TelemetryUtils.sendErrorEvent(TelemetryEventName.scaffoldLocalDebugSettings, systemError);
    return err(systemError);
  }

  TelemetryUtils.sendSuccessEvent(
    TelemetryEventName.scaffoldLocalDebugSettings,
    telemetryProperties
  );
  return ok(Void);
}

async function scaffoldLocalSettingsJson(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings?: Json
): Promise<void> {
  const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath!);

  const includeFrontend = ProjectSettingLoader.includeFrontend(ctx);
  const includeBackend = ProjectSettingLoader.includeBackend(ctx);
  const includeBot = ProjectSettingLoader.includeBot(ctx);

  if (localSettings !== undefined) {
    // Add local settings for the new added capability/resource
    localSettings = localSettingsProvider.incrementalInit(
      localSettings,
      includeBackend,
      includeBot,
      includeFrontend
    );
    await localSettingsProvider.save(localSettings);
  } else {
    // Initialize a local settings on scaffolding
    localSettings = localSettingsProvider.init(includeFrontend, includeBackend, includeBot);
    await localSettingsProvider.save(localSettings);
  }
}
