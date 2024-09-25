// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { NextFunction } from "@feathersjs/hooks";
import { Func, FxError, Inputs, Result, err, ok } from "@microsoft/teamsfx-api";
import { manifestUtils } from "../../component/driver/teamsApp/utils/ManifestUtils";
import { VideoFilterAppRemoteNotSupportedError, assembleError } from "../../error/common";
import { CoreHookContext } from "../types";

const userTasksToBlock: Func[] = [
  // Teams: Add features
  {
    namespace: "fx-solution-azure",
    method: "addFeature",
  },
  // Teams: Zip Teams metadata package
  {
    namespace: "fx-solution-azure",
    method: "buildPackage",
  },
  // Teams: Validate manifest file
  {
    namespace: "fx-solution-azure",
    method: "validateManifest",
  },
];
export async function isVideoFilterProject(projectPath: string): Promise<Result<boolean, FxError>> {
  let manifestResult;
  try {
    manifestResult = await manifestUtils.readAppManifest(projectPath);
  } catch (e) {
    return err(assembleError(e));
  }
  if (manifestResult.isErr()) {
    return err(manifestResult.error);
  }
  const manifest = manifestResult.value;
  return ok(
    (manifest.meetingExtensionDefinition as any)?.videoFiltersConfigurationUrl !== undefined
  );
}
async function shouldBlockExecution(ctx: CoreHookContext): Promise<boolean> {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    return false;
  }

  if (ctx.method === "executeUserTask") {
    let shouldBlockUserTask = false;
    const func: Partial<Func> = ctx.arguments[0];
    for (const item of userTasksToBlock) {
      if (func?.namespace === item.namespace && func?.method === item.method) {
        shouldBlockUserTask = true;
        break;
      }
    }
    if (!shouldBlockUserTask) {
      return false;
    }
  }

  const result = await isVideoFilterProject(inputs.projectPath);
  // Ignore errors and assume this project is not a video filter project
  return result.isOk() && result.value;
}

/**
 * This middleware will block remote operations (provision/deploy/...) since we don't support these operations for now.
 */
export const VideoFilterAppBlockerMW = async (ctx: CoreHookContext, next: NextFunction) => {
  let shouldBlock: boolean;
  try {
    shouldBlock = await shouldBlockExecution(ctx);
  } catch (e) {
    // Ignore errors and assume this project is not a video filter project
    shouldBlock = false;
  }

  if (shouldBlock) {
    ctx.result = err(new VideoFilterAppRemoteNotSupportedError());
    return;
  } else {
    await next();
  }
};
