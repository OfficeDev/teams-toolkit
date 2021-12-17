// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  err,
  Func,
  FxError,
  Inputs,
  Json,
  ok,
  QTreeNode,
  Result,
  SingleSelectQuestion,
  Stage,
  traverse,
  UserCancelError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { Container } from "typedi";
import { createV2Context, isV2, newProjectSettings, TOOLS } from "..";
import { CoreHookContext, FxCore } from "../..";
import { deepCopy } from "../../common";
import { TeamsFxAzureSolutionNameV3 } from "../../plugins/solution/fx-solution/v3/constants";
import { QuestionAppName, QuestionSelectSolution } from "../question";
import { getProjectSettingsPath } from "./projectSettingsLoaderV3";
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
    const res = await TOOLS?.ui.showMessage(
      "warn",
      "We will update your project to make it compatible with the latest Teams Toolkit. We recommend to use git for better tracking file changes before migration. Your original project files will be archived to the .archive folder. You can refer to .archive.log which provides detailed information about the archive process.",
      true,
      "OK"
    );
    const answer = res?.isOk() ? res.value : undefined;
    if (!answer || answer != "OK") {
      TOOLS?.logProvider.info(`[core] V1 project migration was canceled.`);
      ctx.result = ok(null);
      return;
    }
    getQuestionRes = await core._getQuestionsForMigrateV1Project(inputs);
  } else if (method === "init") {
    getQuestionRes = await getQuestionsForInit(inputs);
  } else if (
    [
      "addModule",
      "scaffold",
      "addResource",
      "provisionResourcesV3",
      "localDebugV3",
      "deployArtifactsV3",
      "publishApplicationV3",
    ].includes(method || "")
  ) {
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
      } else if (method === "provisionResourcesV3") {
        getQuestionRes = await getQuestionsForProvision(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2,
          ctx.envInfoV3
        );
      } else if (method === "localDebugV3") {
        getQuestionRes = await getQuestionsForLocalProvision(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2,
          ctx.localSettings
        );
      } else if (method === "deployArtifactsV3") {
        getQuestionRes = await getQuestionsForDeploy(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2,
          ctx.envInfoV3!
        );
      } else if (method === "publishApplicationV3") {
        getQuestionRes = await getQuestionsForPublish(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2,
          ctx.envInfoV3!
        );
      }
    }
  } else {
    if ((isV2() && ctx.solutionV2 && ctx.contextV2) || (ctx.solution && ctx.solutionContext)) {
      const solution = isV2() ? ctx.solutionV2 : ctx.solution;
      const context = isV2() ? ctx.contextV2 : ctx.solutionContext;
      if (solution && context) {
        if (method === "provisionResourcesV2") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.provision,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        } else if (method === "localDebugV2") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.debug,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        } else if (method === "deployArtifactsV2") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.deploy,
            inputs,
            isV2() ? ctx.envInfoV2 : undefined
          );
        } else if (method === "publishApplicationV2") {
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
    TOOLS?.logProvider.error(
      `[core] failed to get questions for ${method}: ${getQuestionRes.error.message}`
    );
    ctx.result = err(getQuestionRes.error);
    return;
  }

  TOOLS?.logProvider.debug(`[core] success to get questions for ${method}`);

  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, TOOLS.ui, TOOLS.telemetryReporter);
    if (res.isErr()) {
      TOOLS?.logProvider.debug(`[core] failed to run question model for ${method}`);
      ctx.result = err(res.error);
      return;
    }
    const desensitized = desensitize(node, inputs);
    TOOLS?.logProvider.info(
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

async function getQuestionsForProvision(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context,
  envInfo?: v3.EnvInfoV3
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForProvision) {
    const res = await solution.getQuestionsForProvision(
      context,
      inputs,
      TOOLS.tokenProvider,
      envInfo
    );
    return res;
  }
  return ok(undefined);
}

async function getQuestionsForDeploy(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context,
  envInfo: v3.EnvInfoV3
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForDeploy) {
    const res = await solution.getQuestionsForDeploy(context, inputs, envInfo, TOOLS.tokenProvider);
    return res;
  }
  return ok(undefined);
}

async function getQuestionsForLocalProvision(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context,
  localSettings?: Json
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForLocalProvision) {
    const res = await solution.getQuestionsForLocalProvision(
      context,
      inputs,
      TOOLS.tokenProvider,
      localSettings
    );
    return res;
  }
  return ok(undefined);
}

async function getQuestionsForPublish(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context,
  envInfo: v3.EnvInfoV3
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForPublish) {
    const res = await solution.getQuestionsForPublish(
      context,
      inputs,
      envInfo,
      TOOLS.tokenProvider.appStudioToken
    );
    return res;
  }
  return ok(undefined);
}

export async function getQuestionsForInit(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (inputs.projectPath) {
    const projectSettingsPath = getProjectSettingsPath(inputs.projectPath);
    if (await fs.pathExists(projectSettingsPath)) {
      const res = await TOOLS.ui.showMessage(
        "warn",
        "projectSettings.json already exists, 'init' operation will replace it, please confirm!",
        true,
        "Confirm"
      );
      if (!(res.isOk() && res.value === "Confirm")) {
        return err(UserCancelError);
      }
    }
  }
  const node = new QTreeNode({ type: "group" });
  //TODO remove hardcoded
  const globalSolutions: v3.ISolution[] = [
    Container.get<v3.ISolution>(TeamsFxAzureSolutionNameV3),
    Container.get<v3.ISolution>("fx-solution-spfx"),
  ];
  const solutionNames: string[] = globalSolutions.map((s) => s.name);
  const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
  selectSolution.staticOptions = solutionNames;
  const solutionSelectNode = new QTreeNode(selectSolution);
  node.addChild(solutionSelectNode);
  const context = createV2Context(newProjectSettings());
  for (const solution of globalSolutions) {
    if (solution.getQuestionsForInit) {
      const res = await solution.getQuestionsForInit(context, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const solutionNode = res.value as QTreeNode;
        solutionNode.condition = { equals: solution.name };
        if (solutionNode.data) solutionSelectNode.addChild(solutionNode);
      }
    }
  }
  node.addChild(new QTreeNode(QuestionAppName));
  return ok(node.trim());
}
