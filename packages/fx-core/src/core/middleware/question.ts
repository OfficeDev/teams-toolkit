// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, Func, FxError, Inputs, ok, QTreeNode, Result, Stage, traverse, UserCancelError } from "@microsoft/teamsfx-api";
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
  const solutionCtx = core.ctx;
  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProject")
    getQuestionRes = await core._getQuestions( Stage.create, inputs, solutionCtx);
  else if (method === "provisionResources"){
    getQuestionRes = await core._getQuestions( Stage.provision, inputs, solutionCtx);
  }
  else if (method === "localDebug"){
    getQuestionRes = await core._getQuestions( Stage.debug, inputs, solutionCtx);
  }
  else if (method === "buildArtifacts"){
    getQuestionRes = await core._getQuestions( Stage.build, inputs, solutionCtx);
  }
  else if (method === "deployArtifacts"){
    getQuestionRes = await core._getQuestions( Stage.deploy, inputs, solutionCtx);
  }
  else if (method === "publishApplication"){
    getQuestionRes = await core._getQuestions( Stage.publish, inputs, solutionCtx);
  }
  else if (method === "executeUserTask"){
    const func = ctx.arguments[0] as Func;
    getQuestionRes = await core._getQuestionsForUserTask(func, inputs, solutionCtx);
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
  }
  await next();
};
