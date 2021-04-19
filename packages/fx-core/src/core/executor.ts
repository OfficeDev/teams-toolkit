// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  err,
  Func,
  FxError,
  NodeType,
  ok,
  QTreeNode,
  Result,
  returnUserError,
  UserError,
  SingleSelectQuestion,
  StringValidation,
  ConfigFolderName,
  Inputs,
  SystemError,
  SolutionContext,
  Void,
  VariableDict,
  EnvMeta,
  SolutionEnvContext,
  ResourceConfigs,
  Task,
  SolutionAllContext,
  FunctionRouter,
  SolutionScaffoldResult,
} from "fx-api";
import { hooks } from "@feathersjs/hooks";
import { writeConfigMW } from "./middlewares/config";
import { projectTypeCheckerMW } from "./middlewares/validation";
import * as error from "./error";
import { CoreContext } from "./context";
import { DefaultSolution } from "../plugins/solution/default";
import { initFolder, mergeDict, replaceTemplateVariable } from "./tools";
import { CoreQuestionNames, QuestionAppName, QuestionRootFolder, QuestionSelectSolution } from "./question";
import * as fs from "fs-extra";
import * as path from "path";
import { solutionMW } from "./middlewares/solution";


export class Executor {

  @hooks([writeConfigMW])
  static async create( ctx: CoreContext, inputs: Inputs ): Promise<Result<string, FxError>> {
     
    // get solution
    ctx.solution = new DefaultSolution();

    // build SolutionContext
    const solutionContext:SolutionContext = {
      ...ctx,
      solutionSetting: {
          name: ctx.solution.name,
          displayName: ctx.solution.displayName,
          version: "1.0.0",
          resources:[],
          resourceSettings:{}
      },
      solutionState: {
          resourceStates:{}
      }
    };

    const initRes = await initFolder(ctx.projectPath, inputs.appName as string);
    if(initRes.isErr()) return err(initRes.error);
    
    // scaffold
    const scaffoldRes = await ctx.solution.scaffold(solutionContext, inputs);
    if(scaffoldRes.isErr()) return err(scaffoldRes.error);
    const templates:SolutionScaffoldResult = scaffoldRes.value;
    ctx.deployTemplates = templates.deployTemplates;
    ctx.provisionTemplates = templates.provisionTemplates;
    ctx.solutionContext = solutionContext;
    return ok(ctx.projectPath);
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async provision(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const provisionConfigs = this.getProvisionConfigs(ctx);
    const solutionContext:SolutionEnvContext = this.getSolutionEnvContext(ctx, provisionConfigs);
    ctx.solutionContext = solutionContext;
    const res = await ctx.solution!.provision(solutionContext, inputs);
    if(res.isOk())
      ctx.variableDict = mergeDict(ctx.variableDict, res.value);
    else
      ctx.variableDict = mergeDict(ctx.variableDict, res.error.result);
    return res.isOk() ? ok(Void) : err(res.error);
  }

  
  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async build(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const solutionContext:SolutionContext = this.getSolutionContext(ctx);
    ctx.solutionContext = solutionContext;
    const res = await ctx.solution!.build(solutionContext, inputs);
    if(res.isErr()) return err(res.error);
    return ok(Void);
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async deploy(ctx: CoreContext, inputs: Inputs): Promise<Result<VariableDict, FxError>> {
    const deployConfigs = this.getDeployConfigs(ctx);
    const solutionContext:SolutionEnvContext = this.getSolutionEnvContext(ctx, deployConfigs);
    ctx.solutionContext = solutionContext;
    const res = await ctx.solution!.deploy(solutionContext, inputs);
    if(res.isOk())
      ctx.variableDict = mergeDict(ctx.variableDict, res.value);
    else 
      ctx.variableDict = mergeDict(ctx.variableDict, res.error.result);
    return res.isOk() ? ok(Void) : err(res.error);
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async publish(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    const provisionConfigs = this.getProvisionConfigs(ctx);
    const solutionContext:SolutionEnvContext = this.getSolutionEnvContext(ctx, provisionConfigs);
    ctx.solutionContext = solutionContext;
    const res = await ctx.solution!.publish(solutionContext, inputs);
    if(res.isOk())
      ctx.variableDict = mergeDict(ctx.variableDict, res.value);
    return res.isOk() ? ok(Void) : err(res.error);
  }

  @hooks([projectTypeCheckerMW])
  static async getQuestionsForLifecycleTask( ctx: CoreContext, task:Task, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    const node = new QTreeNode({ type: NodeType.group });
    const solutionContext = this.getSolutionAllContext(ctx);
    ctx.solutionContext = solutionContext;
    if (task === Task.create) {
      node.addChild(new QTreeNode(QuestionAppName));
      //make sure that global solutions are loaded
      const solutionNames: string[] = [];
      for (const k of ctx.globalSolutions.keys()) {
        solutionNames.push(k);
      }
      const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
      selectSolution.option = solutionNames;
      const select_solution = new QTreeNode(selectSolution);
      node.addChild(select_solution);
      for (const [k, solution] of ctx.globalSolutions) {
        if (solution.getQuestionsForLifecycleTask) {
          const res = await solution.getQuestionsForLifecycleTask( solutionContext, task, inputs);
          if (res.isErr()) return res;
          if (res.value) {
            const solutionNode = res.value as QTreeNode;
            solutionNode.condition = { equals: k };
            if (solutionNode.data) select_solution.addChild(solutionNode);
          }
        }
      }
      node.addChild(new QTreeNode(QuestionRootFolder));
    } else if (ctx.solution) {
      const res = await ctx.solution.getQuestionsForLifecycleTask(solutionContext, task, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const child = res.value as QTreeNode;
        if (child.data) node.addChild(child);
      }
    }
    return ok(node);
  }

  @hooks([projectTypeCheckerMW])
  static async getQuestionsForUserTask( ctx: CoreContext, router:FunctionRouter, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    const namespace = router.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (namespace && "" !== namespace && array.length > 0) {
      const solutionName = array[0];
      const solution = ctx.globalSolutions.get(solutionName);
      if (solution && solution.getQuestionsForUserTask) {
        const solutionContext = this.getSolutionAllContext(ctx);
        ctx.solutionContext = solutionContext;
        return await solution.getQuestionsForUserTask(solutionContext, router, inputs);
      }
    }
    return err(
      returnUserError(
        new Error(`getQuestionsForUserTaskRouteFailed:${JSON.stringify(router)}`),
        error.CoreSource,
        error.CoreErrorNames.getQuestionsForUserTaskRouteFailed
      )
    );
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async executeUserTask( ctx: CoreContext,  func: Func, inputs: Inputs ): Promise<Result<unknown, FxError>> {
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if ("" !== namespace && array.length > 0) {
      const solutionName = array[0];
      const solution = ctx.globalSolutions.get(solutionName);
      if (solution && solution.executeUserTask) {
        const solutionContext = this.getSolutionAllContext(ctx);
        ctx.solutionContext = solutionContext;
        return await solution.executeUserTask(solutionContext, func, inputs);
      }
    }
    return err(
      returnUserError(
        new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
        error.CoreSource,
        error.CoreErrorNames.executeUserTaskRouteFailed
      )
    );
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async executeQuestionFlowFunction( ctx: CoreContext, func:Func, inputs: Inputs ): Promise<Result<unknown, FxError>> {
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (!namespace || "" === namespace || array.length === 0) {
      if (func.method === "validateFolder") {
        if (!func.params) return ok(undefined);
        return await this.validateFolder(func.params as string, inputs);
      }
    } else {
      const solutionName = array[0];
      const solution = ctx.globalSolutions.get(solutionName);
      if (solution && solution.executeQuestionFlowFunction) {
        const solutionContext = this.getSolutionAllContext(ctx);
        ctx.solutionContext = solutionContext;
        return await solution.executeQuestionFlowFunction(solutionContext, func, inputs);
      }
    }
    return err(
      returnUserError(
        new Error(`CallFuncRouteFailed:${JSON.stringify(func)}`),
        error.CoreSource,
        error.CoreErrorNames.CallFuncRouteFailed
      )
    );
  }
  
  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async createEnv(ctx: CoreContext, env: EnvMeta, inputs: Inputs): Promise<Result<Void, FxError>> {
    const existing = ctx.projectSetting.environments[env.name];
    if(!existing){
      ctx.projectSetting.environments[env.name] = env;
      return ok(Void);
    }
    return err(new UserError("EnvExist", "EnvExist", "core"));
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async removeEnv( ctx: CoreContext, env: string, inputs: Inputs): Promise<Result<Void, FxError>> {
    const existing = ctx.projectSetting.environments[env];
    if(existing){
      delete ctx.projectSetting.environments[env];
      return ok(Void);
    }
    return err(new UserError("EnvNotExist", "EnvNotExist", "core"));
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async switchEnv( ctx: CoreContext, env: string, inputs: Inputs): Promise<Result<Void, FxError>> {
    const existing = ctx.projectSetting.environments[env];
    if(existing){
      ctx.projectSetting.currentEnv = env;
      return ok(Void);
    }
    return err(new UserError("EnvNotExist", "EnvNotExist", "core"));
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async listEnvs(ctx: CoreContext, inputs: Inputs): Promise<Result<EnvMeta[], FxError>> {
    const list:EnvMeta[] = [];
    for(const k of Object.keys(ctx.projectSetting.environments)){
      const envMeta = ctx.projectSetting.environments[k];
      list.push(envMeta);
    }
    return ok(list);
  }
 

  static getProvisionConfigs(ctx: CoreContext):ResourceConfigs{
    const resources = ctx.projectSetting.solutionSetting?.resources;
    const provisionConfigs: ResourceConfigs = {};
    if(resources){
      for(const resource of resources){
        if(ctx.provisionTemplates){
          const resourceTemplate = ctx.provisionTemplates[resource];
          if(resourceTemplate){
            replaceTemplateVariable(resourceTemplate, ctx.variableDict);
            provisionConfigs[resource] = resourceTemplate;
          }
        }
      }
    }
    return provisionConfigs;
  }

  static getDeployConfigs(ctx: CoreContext):ResourceConfigs{
    const resources = ctx.projectSetting.solutionSetting?.resources;
    const deployConfigs: ResourceConfigs = {};
    if(resources){
      for(const resource of resources){
        if(ctx.deployTemplates){
          const resourceTemplate = ctx.deployTemplates[resource];
          if(resourceTemplate){
            replaceTemplateVariable(resourceTemplate, ctx.variableDict);
            deployConfigs[resource] = resourceTemplate;
          }
        }
      }
    }
    return deployConfigs;
  }

  static async validateFolder( folder: string,  inputs: Inputs
    ): Promise<Result<unknown, FxError>> {
    const appName = inputs[CoreQuestionNames.AppName] as string;
    if (!appName) return ok(undefined);
    const projectPath = path.resolve(folder, appName);
    const exists = await fs.pathExists(projectPath);
    if (exists)
      return ok(
        `Project folder already exists:${projectPath}, please change a different folder.`
      );
    return ok(undefined);
  }

  static getSolutionContext(ctx: CoreContext):SolutionContext{
    const solutionContext:SolutionContext = {
      projectPath: ctx.projectPath,
      ui: ctx.ui,
      logProvider: ctx.logProvider,
      telemetryReporter: ctx.telemetryReporter,
      projectSetting: ctx.projectSetting,
      projectState: ctx.projectState,
      solutionSetting: ctx.projectSetting.solutionSetting,
      solutionState: ctx.projectState.solutionState
    };
    return solutionContext;
  }

  static getSolutionEnvContext(ctx: CoreContext, resourceConfigs: ResourceConfigs):SolutionEnvContext{
    const envMeta = ctx.projectSetting.environments[ctx.projectSetting.currentEnv];
    const solutionContext:SolutionEnvContext = {
      ...this.getSolutionContext(ctx),
      env: envMeta,
      tokenProvider: ctx.tokenProvider,
      resourceConfigs: resourceConfigs
    };
    return solutionContext;
  }

  static getSolutionAllContext(ctx: CoreContext):SolutionAllContext{
    // build SolutionAllContext
    const provisionConfigs = this.getProvisionConfigs(ctx);
    const deployConfigs = this.getDeployConfigs(ctx);
    const envMeta = ctx.projectSetting.environments[ctx.projectSetting.currentEnv];
    const solutionContext:SolutionAllContext = {
      ...this.getSolutionContext(ctx),
      env: envMeta,
      tokenProvider: ctx.tokenProvider,
      provisionConfigs: provisionConfigs,
      deployConfigs: deployConfigs
    };
    return solutionContext;
  }
  
}



