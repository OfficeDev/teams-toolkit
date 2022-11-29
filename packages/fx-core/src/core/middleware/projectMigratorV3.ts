// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, SettingsFileName, SettingsFolderName } from "@microsoft/teamsfx-api";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { MigrationContext, V2TeamsfxFolder } from "./utils/migrationContext";
import { checkMethod, checkUserTasks } from "./projectMigrator";
import * as path from "path";
import { loadProjectSettingsByProjectPathV2 } from "./projectSettingsLoader";
import { AppYmlGenerator } from "./utils/appYmlGenerator";
import * as fs from "fs-extra";

const MigrationVersion = "2.1.0";

type Migration = (context: MigrationContext) => Promise<void>;
const subMigrations: Array<Migration> = [preMigration, generateSettingsJson, generateAppYml];

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

export async function generateAppYml(context: MigrationContext): Promise<void> {
  const bicepContent: string = await fs.readFile("./templates/azure/provision.bicep", "utf8");
  const appYmlGenerator = new AppYmlGenerator(context.projectSettings!, bicepContent);
  const appYmlString = appYmlGenerator.generateAppYml();
  context.fsWriteFile(path.join(SettingsFolderName, "app.yml"), appYmlString);
}
