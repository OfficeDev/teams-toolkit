// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  CLIPlatforms,
  err,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  traverse,
} from "@microsoft/teamsfx-api";
import { isCLIDotNetEnabled, isPreviewFeaturesEnabled } from "../../common/featureFlags";
import { deepCopy, isExistingTabAppEnabled } from "../../common/tools";
import { getSPFxScaffoldQuestion } from "../../component/feature/spfx";
import { getNotificationTriggerQuestionNode } from "../../component/question";
import { ExistingTabOptionItem, TabSPFxItem } from "../../component/constants";
import { getQuestionsForGrantPermission } from "../collaborator";
import { TOOLS } from "../globalVars";
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

  dotnetCapNode.addChild(new QTreeNode(ProgrammingLanguageQuestionForDotNet));

  // only CLI need folder input
  if (CLIPlatforms.includes(inputs.platform)) {
    runtimeNode.addChild(new QTreeNode(QuestionRootFolder));
  }
  runtimeNode.addChild(new QTreeNode(createAppNameQuestion()));

  return ok(runtimeNode.trim());
}

export async function getQuestionsForCreateProjectV2(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (isCLIDotNetEnabled() && CLIPlatforms.includes(inputs.platform)) {
    return getQuestionsForCreateProjectWithDotNet(inputs);
  } else {
    return getQuestionsForCreateProjectWithoutDotNet(inputs);
  }
}
