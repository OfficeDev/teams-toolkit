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
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { createV2Context, deepCopy, isExistingTabAppEnabled } from "../../common/tools";
import { newProjectSettings } from "../../common/projectSettingsHelper";
import { ExistingTabOptionItem, TabSPFxItem } from "../../plugins/solution/fx-solution/question";
import { getQuestionsForGrantPermission } from "../collaborator";
import { CoreSource, FunctionRouterError } from "../error";
import { isV3, TOOLS } from "../globalVars";
import {
  createAppNameQuestion,
  createCapabilityForDotNet,
  createCapabilityQuestion,
  createCapabilityQuestionPreview,
  ExistingTabEndpointQuestion,
  getCreateNewOrFromSampleQuestion,
  getRuntimeQuestion,
  ProgrammingLanguageQuestion,
  ProgrammingLanguageQuestionForDotNet,
  QuestionRootFolder,
  RuntimeOptionDotNet,
  RuntimeOptionNodeJs,
  SampleSelect,
  ScratchOptionNo,
  ScratchOptionYes,
} from "../question";
import { getAllSolutionPluginsV2 } from "../SolutionPluginContainer";
import { CoreHookContext } from "../types";
import { isPreviewFeaturesEnabled, isCLIDotNetEnabled } from "../../common";
import { getNotificationTriggerQuestionNode } from "../../component/questionV3";
import { getSPFxScaffoldQuestion } from "../../component/feature/spfx";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;
  const core = ctx.self as any;

  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProjectV2") {
    getQuestionRes = await core._getQuestionsForCreateProjectV2(inputs);
  } else if (method === "createProjectV3") {
    getQuestionRes = await core._getQuestionsForCreateProjectV2(inputs);
  } else if (method === "init" || method === "_init") {
    getQuestionRes = await core._getQuestionsForInit(inputs);
  } else if (
    [
      "addFeature",
      "_addFeature",
      "provisionResourcesV3",
      "deployArtifactsV3",
      "publishApplicationV3",
      "executeUserTaskV3",
    ].includes(method || "")
  ) {
    const solutionV3 = ctx.solutionV3;
    const contextV2 = ctx.contextV2;
    if (solutionV3 && contextV2) {
      if (method === "addFeature" || method === "_addFeature") {
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
      } else if (method === "executeUserTaskV3") {
        const func = ctx.arguments[0] as Func;
        getQuestionRes = await core._getQuestionsForUserTaskV3(
          func,
          inputs,
          solutionV3,
          contextV2,
          ctx.envInfoV3 as v2.DeepReadonly<v3.EnvInfoV3>
        );
      }
    }
  } else if (method === "grantPermissionV3") {
    getQuestionRes = await getQuestionsForGrantPermission(inputs);
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
        } else if (method === "executeUserTaskV2") {
          const func = ctx.arguments[0] as Func;
          getQuestionRes = await core._getQuestionsForUserTask(
            context,
            solution,
            func,
            inputs,
            ctx.envInfoV2
          );
        } else if (method === "grantPermissionV2") {
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

export async function getQuestionsForUserTaskV3(
  func: Func,
  inputs: Inputs,
  solution: v3.ISolution,
  context: v2.Context,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (solution.getQuestionsForUserTask) {
    const res = await solution.getQuestionsForUserTask(
      context,
      inputs,
      func,
      envInfo,
      TOOLS.tokenProvider
    );
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
      TOOLS.tokenProvider.m365TokenProvider
    );
    return res;
  }
  return ok(undefined);
}

export async function getQuestionsForInit(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}

export async function getQuestionsForCreateProjectV3(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(undefined);
}

async function setSolutionScaffoldingQuestionNodeAsChild(
  inputs: Inputs,
  parent: QTreeNode
): Promise<Result<Void, FxError>> {
  const globalSolutions: v2.SolutionPlugin[] = await getAllSolutionPluginsV2();
  const context = createV2Context(newProjectSettings());
  for (const solutionPlugin of globalSolutions) {
    let res: Result<QTreeNode | QTreeNode[] | undefined, FxError> = ok(undefined);
    const v2plugin = solutionPlugin as v2.SolutionPlugin;
    res = v2plugin.getQuestionsForScaffolding
      ? await v2plugin.getQuestionsForScaffolding(context as v2.Context, inputs)
      : ok(undefined);
    if (res.isErr())
      return err(
        new SystemError({ source: CoreSource, name: "QuestionModelFail", error: res.error })
      );
    if (res.value) {
      const solutionNode = Array.isArray(res.value)
        ? (res.value as QTreeNode[])
        : [res.value as QTreeNode];
      for (const node of solutionNode) {
        if (node.data) {
          parent.addChild(node);
        }
      }
    }
  }
  return ok(Void);
}

async function getQuestionsForCreateProjectWithoutDotNet(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode(getCreateNewOrFromSampleQuestion(inputs.platform));

  // create new
  const createNew = new QTreeNode({ type: "group" });
  node.addChild(createNew);
  createNew.condition = { equals: ScratchOptionYes.id };

  // capabilities
  let capNode: QTreeNode;
  if (isPreviewFeaturesEnabled()) {
    const capQuestion = createCapabilityQuestionPreview();
    capNode = new QTreeNode(capQuestion);
  } else {
    const capQuestion = createCapabilityQuestion();
    capNode = new QTreeNode(capQuestion);
  }
  createNew.addChild(capNode);

  if (!isV3()) {
    const solutionNodeResult = await setSolutionScaffoldingQuestionNodeAsChild(inputs, capNode);
    if (solutionNodeResult.isErr()) {
      return err(solutionNodeResult.error);
    }
  } else {
    const triggerNodeRes = await getNotificationTriggerQuestionNode(inputs);
    if (triggerNodeRes.isErr()) return err(triggerNodeRes.error);
    if (triggerNodeRes.value) {
      capNode.addChild(triggerNodeRes.value);
    }
    const spfxNode = await getSPFxScaffoldQuestion();
    if (spfxNode) {
      spfxNode.condition = { equals: TabSPFxItem.id };
      capNode.addChild(spfxNode);
    }
  }
  // Language
  const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
  if (isPreviewFeaturesEnabled()) {
    programmingLanguage.condition = {
      notEquals: ExistingTabOptionItem.id,
    };
  } else {
    programmingLanguage.condition = {
      minItems: 1,
      excludes: ExistingTabOptionItem.id,
    };
  }
  capNode.addChild(programmingLanguage);

  // existing tab endpoint
  if (isExistingTabAppEnabled()) {
    const existingTabEndpoint = new QTreeNode(ExistingTabEndpointQuestion);
    existingTabEndpoint.condition = {
      equals: ExistingTabOptionItem.id,
    };
    capNode.addChild(existingTabEndpoint);
  }

  createNew.addChild(new QTreeNode(QuestionRootFolder));
  createNew.addChild(new QTreeNode(createAppNameQuestion()));

  // create from sample
  const sampleNode = new QTreeNode(SampleSelect);
  node.addChild(sampleNode);
  sampleNode.condition = { equals: ScratchOptionNo.id };
  sampleNode.addChild(new QTreeNode(QuestionRootFolder));

  return ok(node.trim());
}

async function getQuestionsForCreateProjectWithDotNet(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const runtimeNode = new QTreeNode(getRuntimeQuestion());
  const maybeNode = await getQuestionsForCreateProjectWithoutDotNet(inputs);
  if (maybeNode.isErr()) {
    return err(maybeNode.error);
  }
  const node = maybeNode.value;

  if (node) {
    node.condition = {
      equals: RuntimeOptionNodeJs.id,
    };
    runtimeNode.addChild(node);
  }

  const dotnetNode = new QTreeNode({ type: "group" });
  dotnetNode.condition = {
    equals: RuntimeOptionDotNet.id,
  };
  runtimeNode.addChild(dotnetNode);

  const dotnetCapNode = new QTreeNode(createCapabilityForDotNet());
  dotnetNode.addChild(dotnetCapNode);

  if (!isV3()) {
    const solutionNodeResult = await setSolutionScaffoldingQuestionNodeAsChild(
      inputs,
      dotnetCapNode
    );
    if (solutionNodeResult.isErr()) {
      return err(solutionNodeResult.error);
    }
  } else {
    const triggerNodeRes = await getNotificationTriggerQuestionNode(inputs);
    if (triggerNodeRes.isErr()) return err(triggerNodeRes.error);
    if (triggerNodeRes.value) {
      dotnetCapNode.addChild(triggerNodeRes.value);
    }
    const spfxNode = await getSPFxScaffoldQuestion();
    if (spfxNode) {
      spfxNode.condition = { equals: TabSPFxItem.id };
      dotnetCapNode.addChild(spfxNode);
    }
  }

  dotnetCapNode.addChild(new QTreeNode(ProgrammingLanguageQuestionForDotNet));

  // only CLI need folder input
  if (CLIPlatforms.includes(inputs.platform)) {
    runtimeNode.addChild(new QTreeNode(QuestionRootFolder));
  }
  runtimeNode.addChild(new QTreeNode(createAppNameQuestion()));

  return ok(runtimeNode.trim());
}

//////V2 questions
export async function getQuestionsForCreateProjectV2(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (isCLIDotNetEnabled() && CLIPlatforms.includes(inputs.platform)) {
    return getQuestionsForCreateProjectWithDotNet(inputs);
  } else {
    return getQuestionsForCreateProjectWithoutDotNet(inputs);
  }
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
