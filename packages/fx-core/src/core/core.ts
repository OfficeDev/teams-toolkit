// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  Func,
  FxError,
  ok,
  QTreeNode,
  Result,
  Tools,
  SolutionPlugin,
  Void,
  Core,
  Inputs,
  EnvMeta,
  Task,
  FunctionRouter,
  UserError,
  err,
  StringValidation,
  ProjectSetting,
  ConfigFolderName,
  ProjectState,
  ResourceTemplates,
  ResourceTemplate,
  VariableDict
} from "fx-api";
import { hooks } from "@feathersjs/hooks";
import { concurrentMW } from "./middlewares/concurrent";
import { errorHandlerMW } from "./middlewares/recover";
import { DefaultSolution } from "../plugins/solution/default";
import { CoreContext } from "./context";
import { Executor } from "./executor";
import * as path from "path";
import * as fs from "fs-extra";
import * as error from "./error";
import * as jsonschema from "jsonschema";
import { CoreQuestionNames, QuestionAppName } from "./question";

export class FxCore implements Core {
  
  tools: Tools;

  /**
   * global solutions
   */
  globalSolutions: Map<string, SolutionPlugin> = new Map<string, SolutionPlugin>();

  constructor(tools: Tools) {
    this.tools = tools;
  }

  buildCleanCoreContext():CoreContext{
    const coreContext:CoreContext = {
      ...this.tools,
      projectPath: "",
      projectSetting:{
        name: "myapp",
        environments:
        {
          default: {name:"default", local:false, sideloading:false}
        },
        currentEnv: "default",
        solutionSetting:{
          name:"fx-solution-default",
          version:"1.0.0",
          resources:[],
          resourceSettings:{}
        }
      },
      projectState: {
          solutionState:{resourceStates:{}}
      },
      globalSolutions: this.globalSolutions
    };
    return coreContext;
  }
  async loadCoreContext(projectPath:string):Promise<CoreContext>{
    try{
      const projectSetting:ProjectSetting = await fs.readJson(`${projectPath}\\.${ConfigFolderName}\\setting.json`);
      const projectStates:ProjectState = await fs.readJson(`${projectPath}\\.${ConfigFolderName}\\state.json`);
      const envName = projectSetting.currentEnv;
      const resources = projectSetting.solutionSetting?.resources;
      const privisionTemplates:ResourceTemplates = {};
      const deployTemplates:ResourceTemplates = {};
      if(resources){
        for(const resource of resources){
          const provisionTempalte: ResourceTemplate = await fs.readJson(`${projectPath}\\.${ConfigFolderName}\\${envName}.${resource}.provision.tpl.json`);
          const deployTempalte: ResourceTemplate = await fs.readJson(`${projectPath}\\.${ConfigFolderName}\\${envName}.${resource}.deploy.tpl.json`);
          privisionTemplates[resource] = provisionTempalte;
          deployTemplates[resource] = deployTempalte;
        }
      }
      const userDataPath = `${projectPath}\\.${ConfigFolderName}\\${envName}.userdata`;
      let varDict:VariableDict|undefined = undefined;
      if(await fs.pathExists(userDataPath)){
        varDict = await fs.readJson(userDataPath);
      }
      const coreCtx: CoreContext = {
        projectPath: projectPath,
        projectSetting: projectSetting,
        projectState:projectStates,
        solution: new DefaultSolution(),
        provisionTemplates: privisionTemplates,
        deployTemplates: deployTemplates,
        variableDict: varDict,
        globalSolutions: this.globalSolutions,
        ... this.tools
      };
      return coreCtx;
    }
    catch(e){
      throw  new UserError(
        error.CoreErrorNames.ReadFileError,
        `Read file error:${e}`,
        error.CoreSource
      );
    }
  }

  @hooks([errorHandlerMW])
  async init(inputs: Inputs):Promise<Result<Void, FxError>>{
    const defaultSolution = new DefaultSolution();
    this.globalSolutions.set(defaultSolution.name, defaultSolution);
    return ok(Void);  
  }
  
  @hooks([errorHandlerMW])
  public async create(inputs: Inputs): Promise<Result<string, FxError>> {
    const coreContext = this.buildCleanCoreContext();
    const appName = inputs[CoreQuestionNames.AppName] as string;
    const folder = inputs[CoreQuestionNames.Foler] as string;
    const projectPath = path.resolve(`${folder}/${appName}`);
    const folderExist = await fs.pathExists(projectPath);
    if (folderExist) {
      return err(
        new UserError(
          error.CoreErrorNames.ProjectFolderExist,
          `Project folder exsits:${projectPath}`,
          error.CoreSource
        )
      );
    }
    const validateResult = jsonschema.validate(appName, {
      pattern: (QuestionAppName.validation as StringValidation).pattern,
    });
    if (validateResult.errors && validateResult.errors.length > 0) {
      return err(
        new UserError(
          error.CoreErrorNames.InvalidInput,
          `${validateResult.errors[0].message}`,
          error.CoreSource
        )
      );
    }  
    coreContext.projectSetting.name = appName;
    coreContext.projectPath = projectPath;
    return await Executor.create(coreContext, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async provision(inputs: Inputs): Promise<Result<Void, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    coreContext.tokenProvider = this.tools.tokenProvider;
    return await Executor.provision(coreContext, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async build(inputs: Inputs) : Promise<Result<Void, FxError>>{
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.build(coreContext, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async deploy(inputs: Inputs): Promise<Result<Void, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.deploy(coreContext, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async publish(inputs: Inputs): Promise<Result<Void, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.publish(coreContext, inputs);
  }

  
  @hooks([errorHandlerMW, concurrentMW])
  public async createEnv(env: EnvMeta, inputs: Inputs): Promise<Result<Void, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.createEnv(coreContext, env, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async removeEnv( env: string, inputs: Inputs ): Promise<Result<Void, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.removeEnv(coreContext, env, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async switchEnv(env: string, inputs: Inputs): Promise<Result<Void, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.switchEnv(coreContext, env, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async listEnvs(inputs: Inputs): Promise<Result<EnvMeta[], FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.listEnvs(coreContext, inputs);
  }

  @hooks([errorHandlerMW])
  public async getQuestionsForLifecycleTask(task:Task, inputs: Inputs):Promise<Result<QTreeNode|undefined, FxError>> {
    const coreContext = task === Task.create ? this.buildCleanCoreContext() : await this.loadCoreContext(inputs.projectPath);
    return await Executor.getQuestionsForLifecycleTask(coreContext, task, inputs);
  }

  @hooks([errorHandlerMW])
  public async getQuestionsForUserTask(router:FunctionRouter, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.getQuestionsForUserTask(coreContext, router, inputs);
  }

  @hooks([errorHandlerMW])
  public async executeUserTask(func: Func, inputs: Inputs): Promise<Result<unknown, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.executeUserTask(coreContext, func, inputs);
  }

  @hooks([errorHandlerMW])
  public async executeQuestionFlowFunction(func:Func, inputs: Inputs) : Promise<Result<unknown, FxError>>{
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.executeQuestionFlowFunction(coreContext, func, inputs);
  }
}
 
