// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as fs from "fs-extra";
import {
  err,
  SolutionConfig,
  ConfigMap,
  ConfigFolderName,
  Dict,
  Json,
} from "fx-api";
import * as error from "../error";
import { objectToConfigMap, mapToJson, objectToMap } from "../tools";
import { Settings } from "../settings";
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
      break;
    }
  }

  if (coreCtx! === undefined) {
    ctx.result = err(InternalError());
    return;
  }

  console.log("loadconfig");
  const configs: Map<string, SolutionConfig> = new Map();
  let answers: ConfigMap;
  let settings: Settings;
  try {
    // load configs
    const reg = /env\.(\w+)\.json/;
    for (const file of fs.readdirSync(`${coreCtx.root}/.${ConfigFolderName}`)) {
      const slice = reg.exec(file);
      if (!slice) {
        continue;
      }
      const envName = file.substr(4, file.length - 9);
      const filePath = `${coreCtx.root}/.${ConfigFolderName}/${file}`;
      const configJson: Json = await fs.readJson(filePath);
      const localDataPath = `${coreCtx.root}/.${ConfigFolderName}/${envName}.userdata`;
      if (await fs.pathExists(localDataPath)) {
        const dictContent = await fs.readFile(localDataPath, "UTF-8");
        const dict: Dict<string> = deserializeDict(dictContent);
        mergeSerectData(dict, configJson);
      }
      const solutionConfig: SolutionConfig = objectToMap(configJson);
      configs.set(slice[1], solutionConfig);
    }

    // read answers
    const answerFile = `${coreCtx.root}/.${ConfigFolderName}/answers.json`;
    const answersObj: any = await fs.readJSON(answerFile);
    answers = objectToConfigMap(answersObj);

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
      coreCtx.env = settings.currentEnv;
      coreCtx.answers = answers;

      for (const entry of coreCtx.globalSolutions.entries()) {
        if (entry[0] === settings.selectedSolution.name) {
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

  let coreCtx: CoreContext;

  for (const i in ctx.arguments) {
    if (ctx.arguments[i] instanceof CoreContext) {
      coreCtx = ctx.arguments[i];
      break;
    }
  }

  if (coreCtx! === undefined) {
    ctx.result = err(InternalError());
    return;
  }

  try {
    for (const entry of coreCtx.configs.entries()) {
      const envName = entry[0];
      const solutionConfig = entry[1];
      const configJson = mapToJson(solutionConfig);
      const filePath = `${coreCtx.root}/.${ConfigFolderName}/env.${envName}.json`;
      const localDataPath = `${coreCtx.root}/.${ConfigFolderName}/${envName}.userdata`;
      const localData = sperateSecretData(configJson);
      const content = JSON.stringify(configJson, null, 4);
      await fs.writeFile(filePath, content);
      await fs.writeFile(localDataPath, serializeDict(localData));
    }

    const file = `${coreCtx.root}/.${ConfigFolderName}/answers.json`;
    await fs.writeFile(file, JSON.stringify(coreCtx.answers, null, 4));
    console.log(coreCtx.answers);

    const settings: Settings = {
      selectedSolution: {
        name: coreCtx.selectedSolution!.name,
        version: coreCtx.selectedSolution!.version,
      },
      currentEnv: coreCtx.env!,
    };
    console.log(settings);
    await fs.writeFile(
      `${coreCtx.root}/.${ConfigFolderName}/settings.json`,
      JSON.stringify(settings, null, 4)
    );
  } catch (e) {
    console.log(e);
    ctx.result = err(error.ReadFileError(e));
    return;
  }
};

const SecretDataMatchers = [
  "fx-resource-aad-app-for-teams.clientSecret",
  "fx-resource-aad-app-for-teams.local_clientSecret",
  "fx-resource-simple-auth.filePath",
  "fx-resource-simple-auth.environmentVariableParams",
  "fx-resource-local-debug.*",
  "fx-resource-teamsbot.botPassword",
  "fx-resource-teamsbot.localBotPassword",
  "fx-resource-apim.apimClientAADClientSecret",
];

function sperateSecretData(configJson: Json): Dict<string> {
  const res: Dict<string> = {};
  for (const matcher of SecretDataMatchers) {
    const splits = matcher.split(".");
    const resourceId = splits[0];
    const item = splits[1];
    const resourceConfig: any = configJson[resourceId];
    if ("*" !== item) {
      const originalItemValue = resourceConfig[item];
      if (originalItemValue) {
        const keyName = `${resourceId}.${item}`;
        res[keyName] = originalItemValue;
        resourceConfig[item] = `{{${keyName}}}`;
      }
    } else {
      for (const itemName of Object.keys(resourceConfig)) {
        const originalItemValue = resourceConfig[itemName];
        if (originalItemValue) {
          const keyName = `${resourceId}.${itemName}`;
          res[keyName] = originalItemValue;
          resourceConfig[itemName] = `{{${keyName}}}`;
        }
      }
    }
  }
  return res;
}

function mergeSerectData(dict: Dict<string>, configJson: Json): void {
  for (const matcher of SecretDataMatchers) {
    const splits = matcher.split(".");
    const resourceId = splits[0];
    const item = splits[1];
    const resourceConfig: any = configJson[resourceId];
    if ("*" !== item) {
      const originalItemValue: string | undefined = resourceConfig[item] as
        | string
        | undefined;
      if (
        originalItemValue &&
        originalItemValue.startsWith("{{") &&
        originalItemValue.endsWith("}}")
      ) {
        const keyName = `${resourceId}.${item}`;
        resourceConfig[item] = dict[keyName];
      }
    } else {
      for (const itemName of Object.keys(resourceConfig)) {
        const originalItemValue = resourceConfig[itemName];
        if (
          originalItemValue &&
          originalItemValue.startsWith("{{") &&
          originalItemValue.endsWith("}}")
        ) {
          const keyName = `${resourceId}.${itemName}`;
          resourceConfig[itemName] = dict[keyName];
        }
      }
    }
  }
}

function serializeDict(dict: Dict<string>): string {
  const array: string[] = [];
  for (const key of Object.keys(dict)) {
    const value = dict[key];
    array.push(`${key}=${value}`);
  }
  return array.join("\n");
}

function deserializeDict(data: string): Dict<string> {
  const lines = data.split("\n");
  const dict: Dict<string> = {};
  for (const line of lines) {
    const index = line.indexOf("=");
    if (index > 0) {
      const key = line.substr(0, index);
      const value = line.substr(index + 1);
      dict[key] = value;
    }
  }
  return dict;
}

