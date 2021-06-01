// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as error from "../error";
import { ConfigFolderName, Inputs, Json, Platform, PluginConfig, ProjectSettings, SolutionConfig, SolutionContext, UserError } from "@microsoft/teamsfx-api";
import { deserializeDict, FxCore, mergeSerectData, objectToMap } from "../..";
import * as path from "path";
import * as fs from "fs-extra";

// export const ContextLoaderMW: Middleware = async (
//   ctx: HookContext,
//   next: NextFunction
// ) => {
//   try {
//     const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
//     const core = ctx.self as FxCore;
//     if(inputs.projectPath && ctx.method !== "createProject")
//      await loadSolutionContext(core, inputs);
//     else 
//     {
//       delete inputs.projectPath;
//       await newSolutionContext(core, inputs);
//     }  
//   }
//   catch(e) {
//     ctx.result = err(error.CreateContextError);
//     return ;
//   }
//   await next();
// };



export async function loadSolutionContext(core: FxCore, inputs: Inputs):Promise<SolutionContext>{
  try {

    if(!inputs.projectPath || inputs.platform === Platform.VS || inputs.ignoreTypeCheck){
      return await newSolutionContext(core, inputs);
    }
 
    const confFolderPath = path.resolve(inputs.projectPath!, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(confFolderPath, "settings.json");
    const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
    if(!projectSettings.currentEnv)
      projectSettings.currentEnv = "default";
    const envName = projectSettings.currentEnv;
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
    return solutionContext;
  } catch (e) {
    throw new UserError(
      error.CoreErrorNames.ReadFileError,
      `Read file error:${e}`,
      error.CoreSource,
      e["stack"]
    );
  }
}

export async function newSolutionContext(core: FxCore, inputs?: Inputs):Promise<SolutionContext>{
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
  return solutionContext;
}