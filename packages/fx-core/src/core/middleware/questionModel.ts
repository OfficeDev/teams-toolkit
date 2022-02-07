// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  CLIPlatforms,
  err,
  Func,
  FunctionRouter,
  FxError,
  Inputs,
  ok,
  Platform,
  QTreeNode,
  Result,
  Solution,
  SolutionContext,
  Stage,
  SystemError,
  traverse,
  UserCancelError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { CoreSource, createV2Context, FunctionRouterError, newProjectSettings, TOOLS } from "..";
import { CoreHookContext, FxCore } from "../..";
import { deepCopy } from "../../common";
import {
  createCapabilityQuestion,
  DefaultAppNameFunc,
  getCreateNewOrFromSampleQuestion,
  ProgrammingLanguageQuestion,
  QuestionAppName,
  QuestionRootFolder,
  QuestionV1AppName,
  SampleSelect,
  ScratchOptionNo,
  ScratchOptionYes,
} from "../question";
import {
  getAllSolutionPlugins,
  getAllSolutionPluginsV2,
  getGlobalSolutionsV3,
} from "../SolutionPluginContainer";
import { getProjectSettingsPath, newSolutionContext } from "./projectSettingsLoader";
/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;
  const core = ctx.self as FxCore;

  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProjectV2") {
    getQuestionRes = await core._getQuestionsForCreateProjectV2(inputs);
  } else if (method === "createProjectV3") {
    getQuestionRes = await core._getQuestionsForCreateProjectV3(inputs);
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
  } else if (method === "init" || method === "_init") {
    getQuestionRes = await core._getQuestionsForInit(inputs);
  } else if (
    ["addFeature", "provisionResourcesV3", "deployArtifactsV3", "publishApplicationV3"].includes(
      method || ""
    )
  ) {
    const solutionV3 = ctx.solutionV3;
    const contextV2 = ctx.contextV2;
    if (solutionV3 && contextV2) {
      if (method === "addFeature") {
        getQuestionRes = await core._getQuestionsForAddFeature(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2
        );
      } else if (method === "provisionResourcesV3") {
        getQuestionRes = await core._getQuestionsForProvision(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2,
          ctx.envInfoV3 as v2.DeepReadonly<v3.EnvInfoV3>
        );
      } else if (method === "deployArtifactsV3") {
        getQuestionRes = await core._getQuestionsForDeploy(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2,
          ctx.envInfoV3 as v2.DeepReadonly<v3.EnvInfoV3>
        );
      } else if (method === "publishApplicationV3") {
        getQuestionRes = await core._getQuestionsForPublish(
          inputs as v2.InputsWithProjectPath,
          solutionV3,
          contextV2,
          ctx.envInfoV3 as v2.DeepReadonly<v3.EnvInfoV3>
        );
      }
    }
  } else {
    if (ctx.solutionV2 && ctx.contextV2) {
      const solution = ctx.solutionV2;
      const context = ctx.contextV2;
      if (solution && context) {
        if (method === "provisionResources" || method === "provisionResourcesV2") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.provision,
            inputs,
            ctx.envInfoV2
          );
        } else if (method === "localDebug" || method === "localDebugV2") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.debug,
            inputs,
            ctx.envInfoV2
          );
        } else if (method === "deployArtifacts" || method === "deployArtifactsV2") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.deploy,
            inputs,
            ctx.envInfoV2
          );
        } else if (method === "publishApplication" || method === "publishApplicationV2") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.publish,
            inputs,
            ctx.envInfoV2
          );
        } else if (method === "executeUserTask") {
          const func = ctx.arguments[0] as Func;
          getQuestionRes = await core._getQuestionsForUserTask(
            context,
            solution,
            func,
            inputs,
            ctx.envInfoV2
          );
        } else if (method === "grantPermission") {
          getQuestionRes = await core._getQuestions(
            context,
            solution,
            Stage.grantPermission,
            inputs,
            ctx.envInfoV2
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

//////V3 questions
export async function getQuestionsForAddFeature(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForAddFeature) {
    const res = await solution.getQuestionsForAddFeature(context, inputs);
    return res;
  }
  return ok(undefined);
}

export async function getQuestionsForProvision(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForProvision) {
    const res = await solution.getQuestionsForProvision(
      context,
      inputs,
      envInfo,
      TOOLS.tokenProvider
    );
    return res;
  }
  return ok(undefined);
}

export async function getQuestionsForDeploy(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForDeploy) {
    const res = await solution.getQuestionsForDeploy(context, inputs, envInfo, TOOLS.tokenProvider);
    return res;
  }
  return ok(undefined);
}

export async function getQuestionsForPublish(
  inputs: v2.InputsWithProjectPath,
  solution: v3.ISolution,
  context: v2.Context,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>
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
  const globalSolutions = getGlobalSolutionsV3();
  const capQuestion = createCapabilityQuestion();
  const capNode = new QTreeNode(capQuestion);
  node.addChild(capNode);
  const context = createV2Context(newProjectSettings());
  for (const solution of globalSolutions) {
    if (solution.getQuestionsForInit) {
      const res = await solution.getQuestionsForInit(context, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const solutionNode = res.value as QTreeNode;
        if (solutionNode.data) capNode.addChild(solutionNode);
      }
    }
  }
  node.addChild(new QTreeNode(QuestionAppName));
  return ok(node.trim());
}

export async function getQuestionsForCreateProjectV3(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode(getCreateNewOrFromSampleQuestion(inputs.platform));
  // create new
  const createNew = new QTreeNode({ type: "group" });
  node.addChild(createNew);
  createNew.condition = { equals: ScratchOptionYes.id };

  // capabilities
  const capQuestion = createCapabilityQuestion();
  const capNode = new QTreeNode(capQuestion);
  createNew.addChild(capNode);
  const globalSolutions = getGlobalSolutionsV3();
  const context = createV2Context(newProjectSettings());
  for (const solution of globalSolutions) {
    if (solution.getQuestionsForInit) {
      const res = await solution.getQuestionsForInit(context, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const solutionNode = res.value as QTreeNode;
        if (solutionNode.data) capNode.addChild(solutionNode);
      }
    }
  }
  // Language
  const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
  programmingLanguage.condition = { minItems: 1 };
  createNew.addChild(programmingLanguage);

  // only CLI need folder input
  if (inputs.platform === Platform.CLI) {
    createNew.addChild(new QTreeNode(QuestionRootFolder));
  }
  createNew.addChild(new QTreeNode(QuestionAppName));

  // create from sample
  const sampleNode = new QTreeNode(SampleSelect);
  node.addChild(sampleNode);
  sampleNode.condition = { equals: ScratchOptionNo.id };
  if (inputs.platform !== Platform.VSCode) {
    sampleNode.addChild(new QTreeNode(QuestionRootFolder));
  }
  return ok(node.trim());
}

//////V2 questions
export async function getQuestionsForCreateProjectV2(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode(getCreateNewOrFromSampleQuestion(inputs.platform));
  // create new
  const createNew = new QTreeNode({ type: "group" });
  node.addChild(createNew);
  createNew.condition = { equals: ScratchOptionYes.id };

  // capabilities
  const capQuestion = createCapabilityQuestion();
  const capNode = new QTreeNode(capQuestion);
  createNew.addChild(capNode);

  const globalSolutions: v2.SolutionPlugin[] = await getAllSolutionPluginsV2();
  const context = createV2Context(newProjectSettings());
  for (const solutionPlugin of globalSolutions) {
    let res: Result<QTreeNode | QTreeNode[] | undefined, FxError> = ok(undefined);
    const v2plugin = solutionPlugin as v2.SolutionPlugin;
    res = v2plugin.getQuestionsForScaffolding
      ? await v2plugin.getQuestionsForScaffolding(context as v2.Context, inputs)
      : ok(undefined);
    if (res.isErr()) return err(new SystemError(res.error, CoreSource, "QuestionModelFail"));
    if (res.value) {
      const solutionNode = Array.isArray(res.value)
        ? (res.value as QTreeNode[])
        : [res.value as QTreeNode];
      for (const node of solutionNode) {
        if (node.data) capNode.addChild(node);
      }
    }
  }

  // Language
  const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
  programmingLanguage.condition = { minItems: 1 };
  createNew.addChild(programmingLanguage);

  // only CLI need folder input
  if (CLIPlatforms.includes(inputs.platform)) {
    createNew.addChild(new QTreeNode(QuestionRootFolder));
  }
  createNew.addChild(new QTreeNode(QuestionAppName));

  // create from sample
  const sampleNode = new QTreeNode(SampleSelect);
  node.addChild(sampleNode);
  sampleNode.condition = { equals: ScratchOptionNo.id };
  if (inputs.platform !== Platform.VSCode) {
    sampleNode.addChild(new QTreeNode(QuestionRootFolder));
  }
  return ok(node.trim());
}

export async function getQuestionsForUserTaskV2(
  ctx: SolutionContext | v2.Context,
  solution: Solution | v2.SolutionPlugin,
  func: FunctionRouter,
  inputs: Inputs,
  envInfo?: v2.EnvInfoV2
): Promise<Result<QTreeNode | undefined, FxError>> {
  const namespace = func.namespace;
  const array = namespace ? namespace.split("/") : [];
  if (namespace && "" !== namespace && array.length > 0) {
    let res: Result<QTreeNode | undefined, FxError> = ok(undefined);
    const solutionV2 = solution as v2.SolutionPlugin;
    if (solutionV2.getQuestionsForUserTask) {
      res = await solutionV2.getQuestionsForUserTask(
        ctx as v2.Context,
        inputs,
        func,
        envInfo!,
        TOOLS.tokenProvider
      );
    }
    if (res.isOk()) {
      if (res.value) {
        const node = res.value.trim();
        return ok(node);
      }
    }
    return res;
  }
  return err(FunctionRouterError(func));
}

export async function getQuestionsV2(
  ctx: SolutionContext | v2.Context,
  solution: Solution | v2.SolutionPlugin,
  stage: Stage,
  inputs: Inputs,
  envInfo?: v2.EnvInfoV2
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (stage !== Stage.create) {
    let res: Result<QTreeNode | undefined, FxError> = ok(undefined);
    const solutionV2 = solution as v2.SolutionPlugin;
    if (solutionV2.getQuestions) {
      inputs.stage = stage;
      res = await solutionV2.getQuestions(ctx as v2.Context, inputs, envInfo!, TOOLS.tokenProvider);
    }
    if (res.isErr()) return res;
    if (res.value) {
      const node = res.value as QTreeNode;
      if (node.data) {
        return ok(node.trim());
      }
    }
  }
  return ok(undefined);
}

export async function getQuestionsForMigrateV1Project(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({ type: "group" });
  const globalSolutions: Solution[] = await getAllSolutionPlugins();
  const solutionContext = await newSolutionContext(TOOLS, inputs);

  for (const v of globalSolutions) {
    if (v.getQuestions) {
      const res = await v.getQuestions(Stage.migrateV1, solutionContext);
      if (res.isErr()) return res;
      if (res.value) {
        const solutionNode = res.value as QTreeNode;
        solutionNode.condition = { equals: v.name };
        if (solutionNode.data) node.addChild(solutionNode);
      }
    }
  }

  const defaultAppNameFunc = new QTreeNode(DefaultAppNameFunc);
  node.addChild(defaultAppNameFunc);

  const appNameQuestion = new QTreeNode(QuestionV1AppName);
  appNameQuestion.condition = {
    validFunc: (input: any) => (!input ? undefined : "App name is auto generated."),
  };
  defaultAppNameFunc.addChild(appNameQuestion);
  return ok(node.trim());
}
