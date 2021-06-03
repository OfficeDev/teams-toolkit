// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, Func, FxError, Inputs, ok, QTreeNode, Result, Solution, SolutionContext, Stage, traverse } from "@microsoft/teamsfx-api";
import { FxCore } from "../..";
import { deepCopy } from "../../common";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1]; 
  const method = ctx.method;
  const core = (ctx.self as FxCore);
  
  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProject") {
    getQuestionRes = await core._getQuestionsForCreateProject(inputs);
  }
  else {
    const solution = ctx.solution;
    const solutionContext = ctx.solutionContext; 
    if (method === "provisionResources"){
      getQuestionRes = await core._getQuestions(solutionContext, solution, Stage.provision, inputs);
    }
    else if (method === "localDebug"){
      getQuestionRes = await core._getQuestions(solutionContext, solution, Stage.debug, inputs);
    }
    else if (method === "buildArtifacts"){
      getQuestionRes = await core._getQuestions( solutionContext, solution, Stage.build, inputs);
    }
    else if (method === "deployArtifacts"){
      getQuestionRes = await core._getQuestions( solutionContext, solution, Stage.deploy, inputs);
    }
    else if (method === "publishApplication"){
      getQuestionRes = await core._getQuestions(solutionContext, solution, Stage.publish, inputs);
    }
    else if (method === "executeUserTask"){
      const func = ctx.arguments[0] as Func;
      getQuestionRes = await core._getQuestionsForUserTask(solutionContext, solution, func, inputs);
    }
  }
  
  if (getQuestionRes.isErr()) {
    core.tools.logProvider.error(`[core] failed to get questions for ${method}: ${getQuestionRes.error.message}`);
    ctx.result = err(getQuestionRes.error);
    return;
  }

  core.tools.logProvider.debug(`[core] success to get questions for ${method}`);

  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, core.tools.ui); 
    if(res.isErr()){
      core.tools.logProvider.debug(`[core] failed to run question model for ${method}`);
      ctx.result = err(res.error);
      return;
    }
    const desensitized = desensitize(node, inputs);
    core.tools.logProvider.info(`[core] success to run question model for ${method}, answers:${JSON.stringify(desensitized)}`);
  }
  await next();
};


export function desensitize(node: QTreeNode, input: Inputs):Inputs{
    const copy = deepCopy(input);
    const names = new Set<string>(); 
    traverseToCollectPasswordNodes(node, names);
    for(const name of names){
      copy[name] = "******";
    }
    return copy;
}

export function traverseToCollectPasswordNodes(node: QTreeNode, names: Set<string>){
  if(node.data.type === "text" && node.data.password === true){
    names.add(node.data.name);
  }
  for(const child of (node.children || [])){
    traverseToCollectPasswordNodes(child, names);
  }
}