// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
 
import { ConfigFolderName, err, FxError, Inputs, Json, ok, PluginConfig, ProjectSettings, Result, SolutionConfig, SolutionContext, Stage, StaticPlatforms, Tools, Void} from "@microsoft/teamsfx-api";
import { CoreHookContext, deserializeDict,  FxCore,  mergeSerectData, objectToMap} from "../..";
import { InvalidProjectError, NoProjectOpenedError, PathNotExistError, ReadFileError } from "../error";
import * as path from "path";
import * as fs from "fs-extra";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { validateProject } from "../../common";  
import * as uuid  from "uuid";

export const ContextLoaderMW: Middleware = async (
  ctx: CoreHookContext,
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
    const projectPathExist = await fs.pathExists(inputs.projectPath);
    if(!projectPathExist) {
      ctx.result = err(PathNotExistError(inputs.projectPath));
      return ;
    }
    const core = ctx.self as FxCore;
    const loadRes = await loadSolutionContext(core.tools, inputs);
    if(loadRes.isErr()){
      ctx.result = err(loadRes.error);
      return ;
    }
    const validRes = validateProject(loadRes.value);
    if(validRes){
      ctx.result = err(InvalidProjectError(validRes));
      return ;
    }
    ctx.solutionContext = loadRes.value;
  }  
  await next();
};

export async function loadSolutionContext(tools: Tools, inputs: Inputs):Promise<Result<SolutionContext, FxError>>{
  try {
    const confFolderPath = path.resolve(inputs.projectPath!, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(confFolderPath, "settings.json");
    const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
    if(!projectSettings.currentEnv)
      projectSettings.currentEnv = "default";
    if(!projectSettings.projectId)
      projectSettings.projectId = uuid.v4();
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
      root: inputs.projectPath || "",
      ... tools,
      ... tools.tokenProvider,
      answers: inputs
    } ;
    return ok(solutionContext);
  } catch (e) {
    return err(ReadFileError(e));
  }
}

export async function newSolutionContext(tools: Tools, inputs: Inputs):Promise<SolutionContext>{
  const projectSettings:ProjectSettings = {
    appName: "",
    projectId: inputs.projectId || uuid.v4(),
    currentEnv: "default",
    solutionSettings:{
      name: "fx-solution-azure",
      version:"1.0.0"
    }
  };
  const solutionContext:SolutionContext = {
    projectSettings: projectSettings,
    config: new Map<string, PluginConfig>(),
    root: inputs.projectPath || "",
    ... tools,
    ... tools.tokenProvider,
    answers: inputs
  } ;
  return solutionContext;
}