// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as error from "../error";
import { ConfigFolderName, Inputs, Json, PluginConfig, ProjectSettings, SolutionConfig, SolutionContext, StaticPlatforms, Tools, UserError } from "@microsoft/teamsfx-api";
import { deserializeDict,  mergeSerectData, objectToMap } from "../..";
import * as path from "path";
import * as fs from "fs-extra";

export async function loadSolutionContext(tools: Tools, inputs: Inputs):Promise<SolutionContext>{
  try {

    if(!inputs.projectPath || StaticPlatforms.includes(inputs.platform) || inputs.ignoreTypeCheck){
      return await newSolutionContext(tools, inputs);
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
      ... tools,
      ... tools.tokenProvider,
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

export async function newSolutionContext(tools: Tools, inputs: Inputs):Promise<SolutionContext>{
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
    ... tools,
    ... tools.tokenProvider,
    answers: inputs
  } ;
  return solutionContext;
}