// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  err,
  Func,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  Stage,
  traverse,
} from "@microsoft/teamsfx-api";
import { isV2 } from "..";
import { CoreHookContext, FxCore } from "../..";
import { deepCopy } from "../../common";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;
  const core = ctx.self as FxCore;

  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProject") {
    getQuestionRes = await core._getQuestionsForCreateProject(inputs);
  } else if (method === "migrateV1Project") {
    getQuestionRes = await core._getQuestionsForMigrateV1Project(inputs);
  } else {
    if ((isV2() && ctx.solutionV2 && ctx.contextV2) || (ctx.solution && ctx.solutionContext)) {
      const solution = isV2() ? ctx.solutionV2 : ctx.solution;
      const context = isV2() ? ctx.contextV2 : ctx.solutionContext;
      if (solution && context) {
        if (method === "provisionResources") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.provision,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        } else if (method === "localDebug") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.debug,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        } else if (method === "deployArtifacts") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.deploy,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        } else if (method === "publishApplication") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.publish,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        } else if (method === "executeUserTask") {
          const func = ctx.arguments[0] as Func;
          getQuestionRes = await core._getQuestionsForUserTask(
            context,
            solution,
            func,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        } else if (method === "grantPermission") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.grantPermission,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        }
      }
    }
  }

  if (getQuestionRes.isErr()) {
    core.tools.logProvider.error(
      `[core] failed to get questions for ${method}: ${getQuestionRes.error.message}`
    );
    ctx.result = err(getQuestionRes.error);
    return;
  }

  core.tools.logProvider.debug(`[core] success to get questions for ${method}`);

  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, core.tools.ui, core.tools.telemetryReporter);
    if (res.isErr()) {
      core.tools.logProvider.debug(`[core] failed to run question model for ${method}`);
      ctx.result = err(res.error);
      return;
    }
    const desensitized = desensitize(node, inputs);
    core.tools.logProvider.info(
      `[core] success to run question model for ${method}, answers:${JSON.stringify(desensitized)}`
    );
  }
  await next();
};

export function desensitize(node: QTreeNode, input: Inputs): Inputs {
  const copy = deepCopy(input);
  const names = new Set<string>();
  traverseToCollectPasswordNodes(node, names);
  for (const name of names) {
    copy[name] = "******";
  }
  return copy;
}

export function traverseToCollectPasswordNodes(node: QTreeNode, names: Set<string>): void {
  if (node.data.type === "text" && node.data.password === true) {
    names.add(node.data.name);
  }
  for (const child of node.children || []) {
    traverseToCollectPasswordNodes(child, names);
  }
}
