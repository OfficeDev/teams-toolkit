// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok, Platform } from "@microsoft/teamsfx-api";
import { UpgradeCanceledError } from "../error";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import {
  Component,
  ProjectMigratorStatus,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import { CoreHookContext } from "../types";
import { TOOLS } from "../globalVars";
import { getLocalizedString } from "../../common/localizeUtils";
import { MigrationContext, V2TeamsfxFolder, wrapRunMigration } from "./utils/migrationContext";
import { checkMethod, checkUserTasks, outputCancelMessage, upgradeButton } from "./projectMigrator";

const MigrationVersion = "2.1.0";
const subMigrations = [preMigration];

export const ProjectMigratorMWV3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  if ((await checkVersionForMigration(ctx)) && checkMethod(ctx)) {
    if (!checkUserTasks(ctx)) {
      ctx.result = ok(undefined);
      return;
    }

    // TODO: user confirm for migration
    // sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotificationStart);
    // const res = await TOOLS?.ui.showMessage(
    //   "warn",
    //   getLocalizedString("core.migrationToArmAndMultiEnv.Message"),
    //   true,
    //   upgradeButton
    // );
    // const answer = res?.isOk() ? res.value : undefined;
    // if (!answer || answer != upgradeButton) {
    //   sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
    //     [TelemetryProperty.Status]: ProjectMigratorStatus.Cancel,
    //   });
    //   ctx.result = err(UpgradeCanceledError());
    //   outputCancelMessage(ctx);
    //   return;
    // }
    // sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
    //   [TelemetryProperty.Status]: ProjectMigratorStatus.OK,
    // });

    const migrationContext = new MigrationContext(ctx);
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

// TODO
async function getProjectVersion(ctx: CoreHookContext): Promise<string> {
  return "2.1.0";
}
