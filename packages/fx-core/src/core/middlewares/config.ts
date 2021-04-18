// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {HookContext, NextFunction, Middleware} from "@feathersjs/hooks";
import * as fs from "fs-extra";
import {
  err,
  SolutionConfig,
  ConfigFolderName,
  Dict,
  Json,
  Stage,
  ProjectSettings,
} from "fx-api";
import * as error from "../error";
import * as tools from "../tools";
import {InternalError, NotSupportedProjectType} from "../error";
import {CoreContext} from "../context";
import {LaunchConfig} from "../launch";

/**
 * This middleware will help to load configs at beginning.
 */
export const readConfigMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  let coreCtx: CoreContext;

  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      coreCtx = ctx.arguments[i];
      continue;
    }
  }

  if (coreCtx! === undefined) {
    ctx.result = err(InternalError());
    return;
  }

  if (coreCtx.stage === Stage.create) {
    await next();
    return;
  }

  try {
    // load config
    let configJson: Json;
    const configPath = `${coreCtx.root}/.${ConfigFolderName}/env.${coreCtx.env}.json`;
    if (await fs.pathExists(configPath)) {
      configJson = await fs.readJson(configPath);
    } else {
      ctx.result = err(NotSupportedProjectType);
      return;
    }

    const localDataPath = `${coreCtx.root}/.${ConfigFolderName}/${coreCtx.env}.userdata`;
    let dict: Dict<string>;
    if (await fs.pathExists(localDataPath)) {
      dict = await fs.readJSON(localDataPath);
    } else {
      dict = {};
    }
    tools.mergeSerectData(dict, configJson);
    const solutionConfig: SolutionConfig = tools.objectToMap(configJson);
    coreCtx.config = solutionConfig;

    // read settings.json to set solution & env & global configs.
    const settingsFile = `${coreCtx.root}/.${ConfigFolderName}/settings.json`;
    const settings: ProjectSettings = await fs.readJSON(settingsFile);
    coreCtx.projectSettings = settings;

    // load selectedSolution
    for (const entry of coreCtx.globalSolutions.entries()) {
      if (entry[0] === settings.solutionSettings!.name) {
        coreCtx.selectedSolution = entry[1];
        break;
      }
    }
  } catch (e) {
    ctx.result = err(error.ReadFileError(e));
    return;
  }

  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      const coreCtx = ctx.arguments[i] as CoreContext;
      ctx.arguments[i] = coreCtx;
      break;
    }
  }
  await next();
};

/**
 * This middleware will help to persist configs if necessary.
 */
export const writeConfigMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  await next();
  console.log("writeconfig");

  let coreCtx: CoreContext | undefined;

  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      coreCtx = ctx.arguments[i];
      break;
    }
  }

  if (coreCtx === undefined) {
    ctx.result = err(InternalError());
    return;
  }

  try {
    // write config
    const configJson = tools.mapToJson(coreCtx.config);
    const filePath = `${coreCtx.root}/.${ConfigFolderName}/env.${coreCtx.env}.json`;
    const localDataPath = `${coreCtx.root}/.${ConfigFolderName}/${coreCtx.env}.userdata`;
    const localData = tools.sperateSecretData(configJson);
    const content = JSON.stringify(configJson, null, 4);
    await fs.writeFile(filePath, content);
    await fs.writeFile(localDataPath, JSON.stringify(localData, null, 4));

    // write settings.json
    await fs.writeFile(
      `${coreCtx.root}/.${ConfigFolderName}/settings.json`,
      JSON.stringify(coreCtx.projectSettings, null, 4)
    );
  } catch (e) {
    ctx.result = err(error.ReadFileError(e));
    return;
  }
};
