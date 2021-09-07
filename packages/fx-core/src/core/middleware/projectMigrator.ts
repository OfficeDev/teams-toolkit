// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigFolderName, err, FxError, Inputs, ok } from "@microsoft/teamsfx-api";
import { CoreHookContext } from "../..";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";

export const ProjectMigratorMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  if (await needMigrateToArmAndMultiEnv(ctx)) {
    // TODO: ui - user confirm
    const isMigrationSelected = false;
    if (isMigrationSelected) {
      await migrateToArmAndMultiEnv(ctx);
      await next();
    }
    return;
  }
  await next();
};

async function needMigrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<boolean> {
  return false;
}

async function migrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<void> {
  try {
    await migrateArm(ctx);
    await migrateMultiEnv(ctx);
  } finally {
    await cleanup(ctx);
  }
}

async function migrateMultiEnv(ctx: CoreHookContext) {}

async function migrateArm(ctx: CoreHookContext) {}

async function cleanup(ctx: CoreHookContext) {}
