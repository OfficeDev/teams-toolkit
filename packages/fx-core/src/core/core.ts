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
  ProjectSettings,
  ConfigFolderName,
  ProjectStates,
  ResourceTemplates,
  ResourceTemplate,
  VariableDict,
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
import { QuestionAppName } from "./question";

export class FxCore implements Core {
  
  tools: Tools;

  /**
   * global solutions
   */
  solutions: Map<string, SolutionPlugin> = new Map<string, SolutionPlugin>();

  constructor(tools: Tools) {
    this.tools = tools;
  }

  async loadCoreContext(projectPath:string):Promise<CoreContext>{
    try{
      const projectSettings:ProjectSettings = await fs.readJson(`${projectPath}/.${ConfigFolderName}/settings.json`);
      const projectStates:ProjectStates = await fs.readJson(`${projectPath}/.${ConfigFolderName}/states.json`);
      const env = projectSettings.env;
      const resources = projectSettings.solutionSettings?.resources;
      const privisionTemplates:ResourceTemplates = {};
      const deployTemplates:ResourceTemplates = {};
      if(resources){
        for(const resource of resources){
          const provisionTempalte: ResourceTemplate = await fs.readJson(`${projectPath}/.${ConfigFolderName}/${env}.provision.tpl.json`);
          const deployTempalte: ResourceTemplate = await fs.readJson(`${projectPath}/.${ConfigFolderName}/${env}.deploy.tpl.json`);
          privisionTemplates[resource] = provisionTempalte;
          deployTemplates[resource] = deployTempalte;
        }
      }
      const varDict:VariableDict = await fs.readJson(`${projectPath}/.${ConfigFolderName}/${env}.userdata`);
      const envMeta:EnvMeta = {
        name: varDict.name as string,
        local: varDict.local as boolean,
        sideloading: varDict.sideloading as boolean
      };
      const coreCtx: CoreContext = {
        projectPath: projectPath,
        projectSettings: projectSettings,
        projectStates:projectStates,
        solution: new DefaultSolution(),
        env: envMeta,
        provisionTemplates: privisionTemplates,
        deployTemplates: deployTemplates,
        variableDict: varDict,
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
    this.solutions.set(defaultSolution.name, defaultSolution);
    return ok(Void);  
  }
  
  @hooks([errorHandlerMW])
  public async create(inputs: Inputs): Promise<Result<string, FxError>> {
    const appName = inputs.appName as string;
    const folder = inputs.folder as string;
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
    const coreContext:CoreContext = {
      projectPath: projectPath,
      ui: this.tools.ui,
      logProvider: this.tools.logProvider,
      telemetryReporter: this.tools.telemetryReporter,
      projectSettings:{
        name: appName,
        env: "default"
      },
      projectStates: {
          solutionStates:{}
      }
    };
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
    return await Executor.createEnv(coreContext, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async removeEnv( env: string, inputs: Inputs ): Promise<Result<Void, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.removeEnv(coreContext, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async switchEnv(env: string, inputs: Inputs): Promise<Result<Void, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.switchEnv(coreContext, inputs);
  }

  @hooks([errorHandlerMW, concurrentMW])
  public async listEnvs(inputs: Inputs): Promise<Result<EnvMeta[], FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.listEnvs(coreContext, inputs);
  }

  @hooks([errorHandlerMW])
  public async getQuestionsForLifecycleTask(task:Task, inputs: Inputs):Promise<Result<QTreeNode|undefined, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.getQuestionsForLifecycleTask(coreContext, task, inputs);
  }

  @hooks([errorHandlerMW])
  public async getQuestionsForUserTask(router:FunctionRouter, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.getQuestionsForUserTask(coreContext, router, inputs);
  }

  @hooks([errorHandlerMW])
  public async executeUserTask(func: Func, inputs: Inputs): Promise<Result<any, FxError>> {
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.executeUserTask(coreContext, func, inputs);
  }

  public async executeQuestionFlowFunction(func:Func, inputs: Inputs) : Promise<Result<unknown, FxError>>{
    const coreContext = await this.loadCoreContext(inputs.projectPath);
    return await Executor.executeQuestionFlowFunction(coreContext, func, inputs);
  }
}
 
