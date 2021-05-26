// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as error from "../error";
import { ConfigFolderName, err, Inputs, Json, PluginConfig, ProjectSettings, SolutionConfig, SolutionContext, UserError } from "@microsoft/teamsfx-api";
import { deserializeDict, FxCore, mergeSerectData, objectToMap } from "../..";
import * as path from "path";
import * as fs from "fs-extra";

export const ContextLoaderMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  try {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    const core = ctx.self as FxCore;
    if(inputs.projectPath && ctx.method !== "createProject")
      loadSolutionContext(core, inputs);
    else 
    {
      delete inputs.projectPath;
      newSolutionContext(core, inputs);
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
    const projectSettings: ProjectSettings = await fs.readJson(
      path.join(inputs.projectPath!, `.${ConfigFolderName}`, "settings.json")
    );
    const envName = projectSettings.currentEnv;
    const confFolderPath = path.resolve(inputs.projectPath!, `.${ConfigFolderName}`);
    const jsonFilePath = path.resolve(confFolderPath, `env.${envName}.json`);
    const configJson: Json = await fs.readJson(jsonFilePath);
    const localDataPath = path.resolve(confFolderPath, `${envName}.userdata`);
    let dict: Record<string,string>;
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
      root: inputs.projectPath!,
      ... core.tools,
      ... core.tools.tokenProvider,
      answers: inputs
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
    answers: inputs
  } ;
  core.ctx = solutionContext;
}