// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import { err, FxError, Inputs, ok, QTreeNode, Result, traverse } from "@microsoft/teamsfx-api";
import { CoreHookContext, TOOLS } from "../..";
import { desensitize } from "../../middleware";
import { getQuestionsForInit } from "../init";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW_V3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;

  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "init") {
    getQuestionRes = await getQuestionsForInit(inputs);
  }

  if (getQuestionRes.isErr()) {
    TOOLS.logProvider.error(
      `[core] failed to get questions for ${method}: ${getQuestionRes.error.message}`
    );
    ctx.result = err(getQuestionRes.error);
    return;
  }

  TOOLS.logProvider.debug(`[core] success to get questions for ${method}`);

  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, TOOLS.ui, TOOLS.telemetryReporter);
    if (res.isErr()) {
      TOOLS.logProvider.debug(`[core] failed to run question model for ${method}`);
      ctx.result = err(res.error);
      return;
    }
    const desensitized = desensitize(node, inputs);
    TOOLS.logProvider.info(
      `[core] success to run question model for ${method}, answers:${JSON.stringify(desensitized)}`
    );
  }
  await next();
};
