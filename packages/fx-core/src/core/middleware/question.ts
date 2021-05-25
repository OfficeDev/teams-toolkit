// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, FxError, InputResult, InputResultType, Inputs, ok, QTreeNode, Result, Stage, traverse, UserCancelError } from "@microsoft/teamsfx-api";
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
  const solutionCtx = (ctx.self as FxCore).ctx;
  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProject")
    getQuestionRes = await ctx.self._getQuestions( Stage.create, inputs );
  else if (method === "provisionResources"){
    getQuestionRes = await ctx.self._getQuestions( Stage.provision, inputs, solutionCtx);
  }
  if (getQuestionRes.isErr()) {
    ctx.result = err(getQuestionRes.error);
    return;
  }

  const node = getQuestionRes.value;
  if (node) {
    const res: InputResult = await traverse(node, inputs, (ctx.self as FxCore).tools.ui);
    if (res.type === InputResultType.error) {
      ctx.result = err(res.error!);
      return;
    } else if (res.type === InputResultType.cancel) {
      ctx.result = err(UserCancelError);
      return;
    }
  }

  await next();
};
