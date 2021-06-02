// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, Func, FxError, Inputs, ok, QTreeNode, Result, Solution, SolutionContext, Stage, traverse } from "@microsoft/teamsfx-api";
import { FxCore } from "../..";

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
  const solutionCtx = ctx.arguments[0] as SolutionContext; 
  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "_createProject") {
    getQuestionRes = await core._getQuestionsForCreateProject(solutionCtx, inputs);
  }
  else {
    const solution = ctx.arguments[1] as Solution;
    if (method === "_provisionResources"){
      getQuestionRes = await core._getQuestions(solutionCtx, solution, Stage.provision, inputs);
    }
    else if (method === "_localDebug"){
      getQuestionRes = await core._getQuestions(solutionCtx, solution, Stage.debug, inputs);
    }
    else if (method === "_buildArtifacts"){
      getQuestionRes = await core._getQuestions( solutionCtx, solution, Stage.build, inputs);
    }
    else if (method === "_deployArtifacts"){
      getQuestionRes = await core._getQuestions( solutionCtx, solution, Stage.deploy, inputs);
    }
    else if (method === "_publishApplication"){
      getQuestionRes = await core._getQuestions(solutionCtx, solution, Stage.publish, inputs);
    }
    else if (method === "_executeUserTask"){
      const func = ctx.arguments[2] as Func;
      getQuestionRes = await core._getQuestionsForUserTask(solutionCtx, solution, func, inputs);
    }
  }
  
  if (getQuestionRes.isErr()) {
    ctx.result = err(getQuestionRes.error);
    return;
  }

  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, core.tools.ui); 
    if(res.isErr()){
      ctx.result = err(res.error);
      return;
    }
    solutionCtx.answers = inputs;
  }
  await next();
};
