// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok } from "@microsoft/teamsfx-api";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { MigrationContext, V2TeamsfxFolder, wrapRunMigration } from "./utils/migrationContext";
import { checkMethod, checkUserTasks } from "./projectMigrator";

const MigrationVersion = "2.1.0";
const subMigrations = [preMigration];

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
