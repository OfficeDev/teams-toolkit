// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as error from "../error";
import { ConfigFolderName, err, Inputs, Json, PluginConfig, ProjectSettings, SolutionConfig, SolutionContext, UserError } from "@microsoft/teamsfx-api";
import { deserializeDict, FxCore, mergeSerectData, objectToMap } from "../..";
import * as path from "path";
import * as fs from "fs-extra";
import { TeamsAppSolution } from "../../plugins";

export const SolutionLoaderMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const core = ctx.self as FxCore;
  core.solution = new TeamsAppSolution();
  await next();
};
 