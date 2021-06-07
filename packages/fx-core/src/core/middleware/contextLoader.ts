// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
 
import { ConfigFolderName, err, Inputs, Json, PluginConfig, ProjectSettings, SolutionConfig, SolutionContext, Stage, StaticPlatforms, Tools} from "@microsoft/teamsfx-api";
import { deserializeDict,  FxCore,  mergeSerectData, objectToMap} from "../..";
import { InvalidProjectError, NoProjectOpenedError, PathNotExistError, ReadFileError } from "../error";
import * as path from "path";
import * as fs from "fs-extra";
import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { validateProject } from "../../common"; 

export const ContextLoaderMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const method = ctx.method;
  let isCreate = false;
  if(method === "getQuestions"){
    const task = ctx.arguments[0] as Stage;
    isCreate = (task === Stage.create);
  }
  const ignoreLoad = inputs.ignoreTypeCheck === true || StaticPlatforms.includes(inputs.platform) || isCreate;
  if(!ignoreLoad)
  {
    if(!inputs.projectPath){
      ctx.result = err(NoProjectOpenedError());
      return ;
    }
    if(!await fs.pathExists(inputs.projectPath)) {
      ctx.result = err(PathNotExistError(inputs.projectPath));
      return ;
    }
    const core = ctx.self as FxCore;
    const sctx = await loadSolutionContext(core.tools, inputs);
    const validRes = validateProject(sctx);
    if(validRes){
      ctx.result = err(InvalidProjectError(validRes));
      return ;
    }
    ctx.solutionContext = sctx;
  }  
  await next();
};

export async function loadSolutionContext(tools: Tools, inputs: Inputs):Promise<SolutionContext>{
  try {
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
    throw ReadFileError(e);
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