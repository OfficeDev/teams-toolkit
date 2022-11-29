// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, SettingsFileName, SettingsFolderName } from "@microsoft/teamsfx-api";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { MigrationContext, teamsfxFolder, V2TeamsfxFolder } from "./utils/migrationContext";
import { checkMethod, checkUserTasks } from "./projectMigrator";
import * as path from "path";
import { loadProjectSettingsByProjectPathV2 } from "./projectSettingsLoader";
import { FileType, namingConverterV3 } from "./MigrationUtils";

const MigrationVersion = "2.1.0";

type Migration = (context: MigrationContext) => Promise<void>;
const subMigrations: Array<Migration> = [preMigration, generateSettingsJson];

export const ProjectMigratorMWV3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  if ((await checkVersionForMigration(ctx)) && checkMethod(ctx)) {
    if (!checkUserTasks(ctx)) {
      ctx.result = ok(undefined);
      return;
    }

    // TODO: add user confirm for migration
    const migrationContext = await MigrationContext.create(ctx);
    await wrapRunMigration(migrationContext, migrate);
    ctx.result = ok(undefined);
  } else {
    // continue next step only when:
    // 1. no need to upgrade the project;
    // 2. no need to update Teams Toolkit version;
    await next();
  }
};

export async function wrapRunMigration(
  context: MigrationContext,
  exec: (context: MigrationContext) => void
): Promise<void> {
  try {
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationStart);
    await exec(context);
    await showSummaryReport(context);
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationEnd);
  } catch (error: any) {
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationFailed);
    await rollbackMigration(context);
    throw error;
  }
}

async function rollbackMigration(context: MigrationContext): Promise<void> {
  await context.cleanModifiedPaths();
  await context.restoreBackup();
  await context.cleanTeamsfx();
}

async function showSummaryReport(context: MigrationContext): Promise<void> {}

async function migrate(context: MigrationContext): Promise<void> {
  for (const subMigration of subMigrations) {
    await subMigration(context);
  }
}

async function preMigration(context: MigrationContext): Promise<void> {
  await context.backup(V2TeamsfxFolder);
}

export async function statesMigration(context: MigrationContext): Promise<void> {
  // general
  if (await context.fsPathExists(path.join(".fx", "states"))) {
    // if ./fx/states/ exists
    const fileNames = context.fsReadDirSync(path.join(".fx", "states")); // search all files, get file names
    const fileRegex = new RegExp("state\\.[a-zA-Z0-9_]*\\.json", "g"); // state.*.json
    for (const fileName in fileNames) {
      const fileNamesArray = fileRegex.exec(fileName);
      if (fileNamesArray != null && fileNamesArray.length == 1) {
        // get envName
        const envName = fileName.substring(
          fileName.indexOf("state.") + 6,
          fileName.indexOf(".json")
        );
        // create .env.{env} file
        await context.fsEnsureDir(teamsfxFolder);
        await context.fsCreateFile(teamsfxFolder + "/.env." + envName);
        const obj = await context.readStateFile(
          path.join(".fx", "states", "state." + envName + ".json")
        );
        if (obj) {
          let envData = "";
          const bicepContent = context.readBicepContent();
          // convert every name
          for (const keyName of Object.keys(obj)) {
            for (const name of Object.keys(obj[keyName])) {
              const nameV3 = await namingConverterV3(
                "state." + keyName + "." + name,
                FileType.STATE,
                bicepContent
              );
              envData += nameV3 + "=" + obj[keyName][name] + "\n";
            }
          }
          await context.fsWriteFile(teamsfxFolder + "/.env." + envName, envData);
        }
      }
    }
  }
}

async function checkVersionForMigration(ctx: CoreHookContext): Promise<boolean> {
  const version = await getProjectVersion(ctx);
  return version === MigrationVersion;
}

// TODO: read the real version from project setting
async function getProjectVersion(ctx: CoreHookContext): Promise<string> {
  return "2.1.0";
}

export async function generateSettingsJson(context: MigrationContext): Promise<void> {
  const oldProjectSettings = await loadProjectSettingsByProjectPathV2(context.projectPath, true);
  if (oldProjectSettings.isOk()) {
    const content = {
      version: "3.0.0",
      trackingId: oldProjectSettings.value.projectId,
    };

    await context.fsEnsureDir(SettingsFolderName);
    await context.fsWriteFile(
      path.join(SettingsFolderName, SettingsFileName),
      JSON.stringify(content, null, 4)
    );
  } else {
    throw oldProjectSettings.error;
  }
}
