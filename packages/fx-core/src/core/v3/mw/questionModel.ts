// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  err,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  traverse,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { CoreHookContext, TOOLS } from "../../..";
import { desensitize } from "../../middleware";
import { getQuestionsForInit } from "../init";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW_V3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;

  let getQuestionRes: Result<QTreeNode | QTreeNode[] | undefined, FxError> = ok(undefined);
  if (method === "init") {
    getQuestionRes = await getQuestionsForInit(inputs);
  } else if (["addModule", "scaffold", "addResource"].includes(method || "")) {
    const solutionV3 = ctx.solutionV3;
    const contextV2 = ctx.contextV2;
    if (solutionV3 && contextV2) {
      if (method === "addModule") {
        getQuestionRes = await getQuestionsForAddModule(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2
        );
      } else if (method === "scaffold") {
        getQuestionRes = await getQuestionsForScaffold(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2
        );
      } else if (method === "addResource") {
        getQuestionRes = await getQuestionsForAddResource(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2
        );
      }
    }
  }

  if (getQuestionRes.isErr()) {
    TOOLS.logProvider.error(
      `[core] failed to get questions for ${method}: ${getQuestionRes.error.message}`
    );
    ctx.result = err(getQuestionRes.error);
    return;
  }

  TOOLS.logProvider.debug(`[core] success to get questions for ${method}`);

  const nodes = getQuestionRes.value;
  if (nodes) {
    const node = Array.isArray(nodes) ? nodes[0] : nodes;
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

export async function getQuestionsForScaffold(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context
): Promise<Result<QTreeNode | QTreeNode[] | undefined, FxError>> {
  if (solution.getQuestionsForScaffold) {
    const res = await solution.getQuestionsForScaffold(context, inputs);
    return res;
  }
  return ok(undefined);
}

export async function getQuestionsForAddModule(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForAddModule) {
    const res = await solution.getQuestionsForAddModule(context, inputs);
    return res;
  }
  return ok(undefined);
}

export async function getQuestionsForAddResource(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForAddResource) {
    const res = await solution.getQuestionsForAddResource(context, inputs);
    return res;
  }
  return ok(undefined);
}
