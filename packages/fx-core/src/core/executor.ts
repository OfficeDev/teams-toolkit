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
  Context,
  SystemError,
  SolutionContext,
  Void,
  VariableDict,
  EnvMeta,
  SolutionEnvContext,
  ResourceConfigs,
} from "fx-api";
import * as path from "path";
import { hooks } from "@feathersjs/hooks";
import * as fs from "fs-extra";


import * as error from "./error";
import {
  CoreQuestionNames,
  QuestionAppName,
  QuestionRootFolder,
  QuestionSelectSolution,
} from "./question";
import { readConfigMW, writeConfigMW } from "./middlewares/config";
import { projectTypeCheckerMW } from "./middlewares/validation";
import { envMW } from "./middlewares/env";
import { solutionMW } from "./middlewares/solution";
import { CoreContext } from "./context";
import { DefaultSolution } from "../plugins/solution/default";
import { initFolder, replaceTemplateVariable } from "./tools";


export class Executor {

  @hooks([writeConfigMW])
  static async create( ctx: CoreContext, inputs: Inputs ): Promise<Result<string, FxError>> {
     
    // get solution
    ctx.solution = new DefaultSolution;
    if(!ctx.solution) {
        return err(new SystemError("SolutionNotFound", "solution not found", "core"));
    }

    // build SolutionContext
    const solutionContext:SolutionContext = {
      ...ctx,
      solutionSettings: {
          name: ctx.solution.name,
          displayName: ctx.solution.displayName,
          version: "1.0.0",
          resources:[],
          resourceSettings:{}
      },
      solutionStates: {
          resourceStates:{}
      }
    };

    const initRes = await initFolder(ctx.projectPath, inputs.appName as string);
    if(initRes.isErr()) return err(initRes.error);
    
    // scaffold
    const scaffoldRes = await ctx.solution.scaffold(solutionContext, inputs);
    if(scaffoldRes.isErr()) return err(scaffoldRes.error);

    const templates = scaffoldRes.value;
    ctx.deployTemplates = templates.deployTemplates;
    ctx.provisionTemplates = templates.provisionTemplates;
    ctx.projectSettings.solutionSettings = solutionContext.solutionSettings;
    ctx.projectStates.solutionStates = solutionContext.solutionStates;
 
    return ok(ctx.projectPath);
  }

   

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async provision(ctx: CoreContext, inputs: Inputs): Promise<Result<VariableDict, FxError>> {
    const env = ctx.env;
    const resources = ctx.projectSettings.solutionSettings?.resources;
    const privisionConfigs: ResourceConfigs = {};
    if(resources){
      for(const resource of resources){
        if(ctx.provisionTemplates){
          const resourceTemplate = ctx.provisionTemplates[resource];
          if(resourceTemplate){
            replaceTemplateVariable(resourceTemplate, ctx.variableDict);
            privisionConfigs[resource] = resourceTemplate;
          }
        }
      }
    }
    if(!env) {
      return err(new SystemError("EnvEmpty", "Env is empty", "core"));
    }
    // build SolutionContext
    const solutionContext:SolutionEnvContext = {
      ...ctx,
      env: env,
      tokenProvider: ctx.tokenProvider!,
      solutionSettings: ctx.projectSettings.solutionSettings,
      solutionStates: ctx.projectStates.solutionStates,
      resourceConfigs: privisionConfigs
    };
    const res = await ctx.solution!.provision(solutionContext, inputs);
    if(res.isErr()) return err(res.error);
    return ok(Void);
  }

  
  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async build(ctx: CoreContext, inputs: Inputs): Promise<Result<VariableDict, FxError>> {
    
    throw new Error();
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async deploy(ctx: CoreContext, inputs: Inputs): Promise<Result<VariableDict, FxError>> {
    throw new Error();
  }

  @hooks([projectTypeCheckerMW, writeConfigMW])
  static async publish(ctx: CoreContext, inputs: Inputs): Promise<Result<Void, FxError>> {
    throw new Error();
  }

  // @hooks([validationMW, envMW, solutionMW, readConfigMW])
  // static async getQuestions(
  //   ctx: CoreContext
  // ): Promise<Result<QTreeNode | undefined, FxError>> {
  //   const answers = new ConfigMap();
  //   const node = new QTreeNode({ type: NodeType.group });
  //   if (ctx.stage === Stage.create) {
  //     node.addChild(new QTreeNode(QuestionAppName));

  //     //make sure that global solutions are loaded
  //     const solutionNames: string[] = [];
  //     for (const k of ctx.globalSolutions.keys()) {
  //       solutionNames.push(k);
  //     }
  //     const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
  //     selectSolution.option = solutionNames;
  //     const select_solution = new QTreeNode(selectSolution);
  //     node.addChild(select_solution);

  //     for (const [k, v] of ctx.globalSolutions) {
  //       if (v.getQuestions) {
  //         const res = await v.getQuestions(
  //           ctx.stage,
  //           ctx.toSolutionContext(answers)
  //         );
  //         if (res.isErr()) return res;
  //         if (res.value) {
  //           const solutionNode = res.value as QTreeNode;
  //           solutionNode.condition = { equals: k };
  //           if (solutionNode.data) select_solution.addChild(solutionNode);
  //         }
  //       }
  //     }
  //     node.addChild(new QTreeNode(QuestionRootFolder));
  //   } else if (ctx.selectedSolution) {
  //     const res = await ctx.selectedSolution.getQuestions(
  //       ctx.stage,
  //       ctx.toSolutionContext(answers)
  //     );
  //     if (res.isErr()) return res;
  //     if (res.value) {
  //       const child = res.value as QTreeNode;
  //       if (child.data) node.addChild(child);
  //     }
  //   }
  //   return ok(node);
  // }

  // @hooks([validationMW, envMW, solutionMW, readConfigMW])
  // static async getQuestionsForUserTask(
  //   ctx: CoreContext,
  //   func: Func
  // ): Promise<Result<QTreeNode | undefined, FxError>> {
  //   const namespace = func.namespace;
  //   const array = namespace ? namespace.split("/") : [];
  //   if (namespace && "" !== namespace && array.length > 0) {
  //     const solutionName = array[0];
  //     const solution = ctx.globalSolutions.get(solutionName);
  //     if (solution && solution.getQuestionsForUserTask) {
  //       const solutioContext = ctx.toSolutionContext();
  //       return await solution.getQuestionsForUserTask(func, solutioContext);
  //     }
  //   }
  //   return err(
  //     returnUserError(
  //       new Error(`getQuestionsForUserTaskRouteFailed:${JSON.stringify(func)}`),
  //       error.CoreSource,
  //       error.CoreErrorNames.getQuestionsForUserTaskRouteFailed
  //     )
  //   );
  // }

  // @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
  // static async executeUserTask(
  //   ctx: CoreContext,
  //   func: Func,
  //   answer?: ConfigMap
  // ): Promise<Result<any, FxError>> {
  //   const namespace = func.namespace;
  //   const array = namespace ? namespace.split("/") : [];
  //   if ("" !== namespace && array.length > 0) {
  //     const solutionName = array[0];
  //     const solution = ctx.globalSolutions.get(solutionName);
  //     if (solution && solution.executeUserTask) {
  //       const solutioContext = ctx.toSolutionContext(answer);
  //       return await solution.executeUserTask(func, solutioContext);
  //     }
  //   }
  //   return err(
  //     returnUserError(
  //       new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
  //       error.CoreSource,
  //       error.CoreErrorNames.executeUserTaskRouteFailed
  //     )
  //   );
  // }

  // private static async validateFolder(
  //   folder: string,
  //   answer?: ConfigMap
  // ): Promise<Result<any, FxError>> {
  //   const appName = answer?.getString(CoreQuestionNames.AppName);
  //   if (!appName) return ok(undefined);
  //   const projectPath = path.resolve(folder, appName);
  //   const exists = await fs.pathExists(projectPath);
  //   if (exists)
  //     return ok(
  //       `Project folder already exists:${projectPath}, please change a different folder.`
  //     );
  //   return ok(undefined);
  // }

  // @hooks([validationMW, envMW, solutionMW, readConfigMW, writeConfigMW])
  // static async callFunc(
  //   ctx: CoreContext,
  //   func: Func,
  //   answer?: ConfigMap
  // ): Promise<Result<any, FxError>> {
  //   const namespace = func.namespace;
  //   const array = namespace ? namespace.split("/") : [];
  //   if (!namespace || "" === namespace || array.length === 0) {
  //     if (func.method === "validateFolder") {
  //       if (!func.params) return ok(undefined);
  //       return await this.validateFolder(func.params as string, answer);
  //     }
  //   } else {
  //     const solutionName = array[0];
  //     const solution = ctx.globalSolutions.get(solutionName);
  //     if (solution && solution.callFunc) {
  //       return await solution.callFunc(func, ctx.toSolutionContext(answer));
  //     }
  //   }
  //   return err(
  //     returnUserError(
  //       new Error(`CallFuncRouteFailed:${JSON.stringify(func)}`),
  //       error.CoreSource,
  //       error.CoreErrorNames.CallFuncRouteFailed
  //     )
  //   );
  // }

  
  
  @hooks([projectTypeCheckerMW, envMW])
  static async createEnv(ctx: CoreContext, env: EnvMeta, inputs: Inputs): Promise<Result<null, FxError>> {
    throw new Error();
  }

  @hooks([projectTypeCheckerMW, envMW])
  static async removeEnv( ctx: CoreContext, env: EnvMeta, inputs: Inputs): Promise<Result<null, FxError>> {
    throw new Error();
  }

  @hooks([projectTypeCheckerMW, envMW])
  static async switchEnv( ctx: CoreContext, env: EnvMeta, inputs: Inputs): Promise<Result<null, FxError>> {
    throw new Error();
  }

  @hooks([projectTypeCheckerMW, envMW])
  static async listEnvs(ctx: CoreContext, inputs: Inputs): Promise<Result<string[], FxError>> {
    throw new Error();
  }
}



