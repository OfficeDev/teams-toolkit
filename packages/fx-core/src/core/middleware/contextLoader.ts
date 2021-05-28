// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as error from "../error";
import { ConfigFolderName, Dict, err, Inputs, Json, PluginConfig, ProjectSettings, SolutionConfig, SolutionContext, TeamsAppManifest, UserError } from "@microsoft/teamsfx-api";
import { deserializeDict, mergeSerectData, objectToMap } from "../..";
import * as path from "path";
import * as fs from "fs-extra";
import { objectToConfigMap } from "../../common";
import { FxCore } from "..";

export const ContextLoaderMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  try {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    const core = ctx.self as FxCore;
    if(inputs.projectPath !== "" && ctx.method !== "createProject")
     await loadSolutionContext(core, inputs);
    else 
    {
      inputs.projectPath = "";
      await newSolutionContext(core, inputs);
    }  
  }
  catch(e) {
    ctx.result = err(error.CreateContextError);
    return ;
  }
  await next();
};



async function loadSolutionContext(core: FxCore, inputs: Inputs){
  try {
    const confFolderPath = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(confFolderPath, "settings.json");
    const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
    let envName = projectSettings.currentEnv;
    if(!envName) envName = "default";
    const jsonFilePath = path.resolve(confFolderPath, `env.${envName}.json`);
    const configJson: Json = await fs.readJson(jsonFilePath);
    const localDataPath = path.resolve(confFolderPath, `${envName}.userdata`);
    let dict: Dict<string>;
    if (await fs.pathExists(localDataPath)) {
      const dictContent = await fs.readFile(localDataPath, "UTF-8");
      dict = deserializeDict(dictContent);
    } else {
      dict = {};
    }
    mergeSerectData(dict, configJson);
    const solutionConfig: SolutionConfig = objectToMap(configJson);
    const solutionContext:SolutionContext = {
      projectSettings: projectSettings,
      config: solutionConfig,
      root: inputs.projectPath,
      ... core.tools,
      ... core.tools.tokenProvider,
      answers: objectToConfigMap(inputs),
      inputs: inputs,
      platform: inputs?.platform,
      app: new TeamsAppManifest()
    } ;
    core.ctx = solutionContext;
  } catch (e) {
    throw new UserError(
      error.CoreErrorNames.ReadFileError,
      `Read file error:${e}`,
      error.CoreSource
    );
  }
}

async function newSolutionContext(core: FxCore, inputs?: Inputs){
  const projectSettings:ProjectSettings = {
    appName: "",
    currentEnv: "default",
    solutionSettings:{
      name: "fx-solution-azure",
      version:"1.0.0"
    }
  };
  const solutionContext:SolutionContext = {
    projectSettings: projectSettings,
    config: new Map<string, PluginConfig>(),
    root: "",
    ... core.tools,
    ... core.tools.tokenProvider,
    answers: objectToConfigMap(inputs),
    inputs: inputs,
    platform: inputs?.platform,
    app: new TeamsAppManifest()
  } ;
  core.ctx = solutionContext;
}