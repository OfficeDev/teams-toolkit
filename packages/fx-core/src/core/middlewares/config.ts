// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
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
import { InternalError } from "../error";
import { CoreContext } from "../context";

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

  const configs: Map<string, SolutionConfig> = new Map();
   
  let settings: ProjectSettings;
  try {
    // load env
    const reg = /env\.(\w+)\.json/;
    for (const file of fs.readdirSync(`${coreCtx.root}/.${ConfigFolderName}`)) {
      const slice = reg.exec(file);
      if (!slice) {
        continue;
      }
      const envName = slice[1];
      const filePath = `${coreCtx.root}/.${ConfigFolderName}/${file}`;
      const configJson: Json = await fs.readJson(filePath);
      const localDataPath = `${coreCtx.root}/.${ConfigFolderName}/${envName}.userdata`;
      let dict: Dict<string>;
      if (await fs.pathExists(localDataPath)) {
        dict = await fs.readJSON(localDataPath);
      } else {
        dict = {};
      }
      tools.mergeSerectData(dict, configJson);
      const solutionConfig: SolutionConfig = tools.objectToMap(configJson);
      coreCtx.configs.set(envName, solutionConfig);
    }
 
    // read settings.json to set solution & env & global configs.
    const settingsFile = `${coreCtx.root}/.${ConfigFolderName}/settings.json`;
    settings = await fs.readJSON(settingsFile);
  } catch (e) {
    ctx.result = err(error.ReadFileError(e));
    return;
  }

  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      const coreCtx = ctx.arguments[i] as CoreContext;
      coreCtx.configs = configs;
      coreCtx.projectSettings = settings;

      for (const entry of coreCtx.globalSolutions.entries()) {
        if (entry[0] === settings.solutionSettings!.name) {
          coreCtx.selectedSolution = entry[1];
          break;
        }
      }

      ctx.arguments[i] = coreCtx;
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

  let coreCtx: CoreContext|undefined;

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
    for (const entry of coreCtx.configs.entries()) {
      const envName = entry[0];
      const solutionConfig = entry[1];
      const configJson = tools.mapToJson(solutionConfig);
      const filePath = `${coreCtx.root}/.${ConfigFolderName}/env.${envName}.json`;
      const localDataPath = `${coreCtx.root}/.${ConfigFolderName}/${envName}.userdata`;
      const localData = tools.sperateSecretData(configJson);
      const content = JSON.stringify(configJson, null, 4);
      await fs.writeFile(filePath, content);
      await fs.writeFile(localDataPath, JSON.stringify(localData, null, 4));
    }
    // write settings
    await fs.writeFile(
      `${coreCtx.root}/.${ConfigFolderName}/settings.json`,
      JSON.stringify(coreCtx.projectSettings, null, 4)
    );
  } catch (e) {
    ctx.result = err(error.ReadFileError(e));
    return;
  }
};
