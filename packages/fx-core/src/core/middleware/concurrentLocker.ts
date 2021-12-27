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
import { FxCore, TOOLS } from "..";
import { waitSeconds } from "../..";
import { sendTelemetryErrorEvent } from "../../common/telemetry";
import { CallbackRegistry } from "../callback";
import { CoreSource, InvalidProjectError, NoProjectOpenedError, PathNotExistError } from "../error";
import { getLockFolder } from "../tools";
import { shouldIgnored } from "./projectSettingsLoader";

let doingTask: string | undefined = undefined;
export const ConcurrentLockerMW: Middleware = async (ctx: HookContext, next: NextFunction) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
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
  let retryNum = 0;
  for (let i = 0; i < 10; ++i) {
    try {
      await lock(configFolder, { lockfilePath: lockfilePath });
      acquired = true;
      TOOLS?.logProvider.debug(
        `[core] success to acquire lock for task ${taskName} on: ${configFolder}`
      );
      for (const f of CallbackRegistry.get(CoreCallbackEvent.lock)) {
        f();
      }
      try {
        doingTask = taskName;
        if (retryNum > 0) {
          // failed for some try and finally success
          sendTelemetryErrorEvent(
            CoreSource,
            "concurrent-operation",
            new ConcurrentError(CoreSource),
            { retry: retryNum + "", acquired: "true", doing: doingTask, todo: taskName }
          );
        }
        await next();
      } finally {
        await unlock(configFolder, { lockfilePath: lockfilePath });
        for (const f of CallbackRegistry.get(CoreCallbackEvent.unlock)) {
          f();
        }
        TOOLS?.logProvider.debug(`[core] lock released on ${configFolder}`);
        doingTask = undefined;
      }
      break;
    } catch (e) {
      if (e["code"] === "ELOCKED") {
        await waitSeconds(1);
        ++retryNum;
        continue;
      }
      throw e;
    }
  }
  if (!acquired) {
    TOOLS?.logProvider.error(
      `[core] failed to acquire lock for task ${taskName} on: ${configFolder}`
    );
    // failed for 10 times and finally failed
    sendTelemetryErrorEvent(CoreSource, "concurrent-operation", new ConcurrentError(CoreSource), {
      retry: retryNum + "",
      acquired: "false",
      doing: doingTask || "",
      todo: taskName,
    });
    ctx.result = err(new ConcurrentError(CoreSource));
  }
};
