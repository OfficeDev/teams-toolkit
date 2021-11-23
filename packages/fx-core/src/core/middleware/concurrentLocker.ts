// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks";
import {
  ConcurrentError,
  ConfigFolderName,
  CoreCallbackEvent,
  err,
  Func,
  Inputs,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import { lock, unlock } from "proper-lockfile";
import { promisify } from "util";
import { FxCore } from "..";
import { waitSeconds } from "../..";
import { CallbackRegistry } from "../callback";
import { CoreSource, InvalidProjectError, NoProjectOpenedError, PathNotExistError } from "../error";
import { getLockFolder } from "../tools";
import { shouldIgnored } from "./projectSettingsLoader";
export const ConcurrentLockerMW: Middleware = async (ctx: HookContext, next: NextFunction) => {
  const core = ctx.self as FxCore;
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const logger =
    core !== undefined && core.tools !== undefined && core.tools.logProvider !== undefined
      ? core.tools.logProvider
      : undefined;
  const ignoreLock = shouldIgnored(ctx);
  if (ignoreLock) {
    await next();
    return;
  }
  if (!inputs.projectPath) {
    ctx.result = err(NoProjectOpenedError());
    return;
  }
  if (!(await fs.pathExists(inputs.projectPath))) {
    ctx.result = err(PathNotExistError(inputs.projectPath));
    return;
  }
  const configFolder = path.join(inputs.projectPath, `.${ConfigFolderName}`);
  if (!(await fs.pathExists(configFolder))) {
    ctx.result = err(InvalidProjectError());
    return;
  }

  const lockFileDir = getLockFolder(inputs.projectPath);
  const lockfilePath = path.join(lockFileDir, `${ConfigFolderName}.lock`);
  await fs.ensureDir(lockFileDir);
  const taskName = `${ctx.method} ${
    ctx.method === "executeUserTask" ? (ctx.arguments[0] as Func).method : ""
  }`;
  let acquired = false;
  for (let i = 0; i < 10; ++i) {
    try {
      await lock(configFolder, { lockfilePath: lockfilePath });
      acquired = true;
      logger?.debug(`[core] success to acquire lock for task ${taskName} on: ${configFolder}`);
      for (const f of CallbackRegistry.get(CoreCallbackEvent.lock)) {
        f();
      }
      try {
        await next();
      } finally {
        await unlock(configFolder, { lockfilePath: lockfilePath });
        for (const f of CallbackRegistry.get(CoreCallbackEvent.unlock)) {
          f();
        }
        logger?.debug(`[core] lock released on ${configFolder}`);
      }
      break;
    } catch (e) {
      if (e["code"] === "ELOCKED") {
        // logger?.warning(
        //   `[core] failed to acquire lock for task ${taskName} on: ${configFolder}, error: ${e} try again ... `
        // );
        await waitSeconds(1);
        continue;
      }
      throw e;
    }
  }
  if (!acquired) {
    logger?.error(`[core] failed to acquire lock for task ${taskName} on: ${configFolder}`);
    ctx.result = err(new ConcurrentError(CoreSource));
  }
};
