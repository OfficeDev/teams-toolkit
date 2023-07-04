// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import { FxError, Inputs, QTreeNode, Result, err, ok } from "@microsoft/teamsfx-api";

import { traverse } from "../../ui/visitor";
import { getQuestionsForGrantPermission, getQuestionsForListCollaborator } from "../collaborator";
import { TOOLS } from "../globalVars";
import { CoreHookContext } from "../types";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;
  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "grantPermission") {
    getQuestionRes = await getQuestionsForGrantPermission(inputs);
  } else if (method === "listCollaborator" || method == "checkPermission") {
    getQuestionRes = await getQuestionsForListCollaborator(inputs);
  }

  if (getQuestionRes.isErr()) {
    TOOLS?.logProvider.error(
      `[core] failed to get questions for ${method}: ${getQuestionRes.error.message}`
    );
    ctx.result = err(getQuestionRes.error);
    return;
  }
  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, TOOLS.ui, TOOLS.telemetryReporter);
    if (res.isErr()) {
      ctx.result = err(res.error);
      return;
    }
  }
  await next();
};
