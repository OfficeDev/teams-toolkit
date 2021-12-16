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
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { isV2 } from "..";
import { CoreHookContext, FxCore } from "../..";
import { deepCopy } from "../../common";
import { getQuestionsForInit } from "../v3/init";

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
    const res = await core.tools.ui.showMessage(
      "warn",
      "We will update your project to make it compatible with the latest Teams Toolkit. We recommend to use git for better tracking file changes before migration. Your original project files will be archived to the .archive folder. You can refer to .archive.log which provides detailed information about the archive process.",
      true,
      "OK"
    );
    const answer = res?.isOk() ? res.value : undefined;
    if (!answer || answer != "OK") {
      core.tools.logProvider.info(`[core] V1 project migration was canceled.`);
      ctx.result = ok(null);
      return;
    }
    getQuestionRes = await core._getQuestionsForMigrateV1Project(inputs);
  } else if (method === "init") {
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

async function getQuestionsForScaffold(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForScaffold) {
    const res = await solution.getQuestionsForScaffold(context, inputs);
    if (res.isOk()) {
      const solutionValue = res.value;
      if (Array.isArray(solutionValue)) {
        const node = new QTreeNode({ type: "group" });
        for (const child of solutionValue) {
          if (child.data) node.addChild(child);
        }
        return ok(node);
      } else {
        return ok(solutionValue);
      }
    }
    return err(res.error);
  }
  return ok(undefined);
}

async function getQuestionsForAddModule(
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

async function getQuestionsForAddResource(
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
