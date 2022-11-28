// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok } from "@microsoft/teamsfx-api";
import { Middleware, NextFunction, objectHooks } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { MigrationContext, teamsfxFolder, V2TeamsfxFolder } from "./utils/migrationContext";
import { checkMethod, checkUserTasks } from "./projectMigrator";
import { readJson } from "fs-extra";
import path from "path";
import { FileType, namingConverterV3 } from "./MigrationUtils";
import fs from "fs";

const MigrationVersion = "2.1.0";
type Migration = (context: MigrationContext) => Promise<void>;
const subMigrations: Array<Migration> = [preMigration, stateEnvMigration, stateLocalMigration];

// const subMigrations: Array<(context: MigrationContext) => Promise<void>> = [preMigration];

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

export async function stateEnvMigration(context: MigrationContext): Promise<void> {
  await context.fsEnsureDir(teamsfxFolder);
  await context.fsCreateFile(teamsfxFolder + "/.env.dev");
  const obj = await context.readState(path.join(".fx", "states", "state.dev.json"));
  if (obj) {
    const bicepContent = context.readBicepContent();
    for (const keyName of Object.keys(obj)) {
      for (const name of Object.keys(obj[keyName])) {
        const nameV3 = await namingConverterV3(
          "state." + keyName + "." + name,
          FileType.STATE,
          bicepContent
        );
        const dataLine = nameV3 + "=" + obj[keyName][name] + "\n";
        await context.fsWriteFile(teamsfxFolder + "/.env.dev", dataLine);
      }
    }
  }
}

export async function stateLocalMigration(context: MigrationContext): Promise<void> {
  await context.fsEnsureDir(teamsfxFolder);
  await context.fsCreateFile(teamsfxFolder + "/.env.local");
  const obj = await context.readState(path.join(".fx", "states", "state.local.json"));
  if (obj) {
    const bicepContent = context.readBicepContent();
    for (const keyName of Object.keys(obj)) {
      for (const name of Object.keys(obj[keyName])) {
        const nameV3 = await namingConverterV3(
          "state." + keyName + "." + name,
          FileType.STATE,
          bicepContent
        );
        const dataLine = nameV3 + "=" + obj[keyName][name] + "\n";
        await context.fsWriteFile(teamsfxFolder + "/.env.local", dataLine);
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
