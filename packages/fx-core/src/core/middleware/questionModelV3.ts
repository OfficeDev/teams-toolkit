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
  SingleSelectQuestion,
  traverse,
} from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../common/localizeUtils";
import { createHostTypeTriggerQuestion } from "../../plugins/resource/bot/question";
import {
  AzureResourceSQLNewUI,
  AzureSolutionQuestionNames,
  BotOptionItem,
  NotificationOptionItem,
} from "../../plugins/solution/fx-solution/question";
import { TOOLS } from "../globalVars";
import {
  createAppNameQuestion,
  createCapabilityQuestionPreview,
  getCreateNewOrFromSampleQuestion,
  ProgrammingLanguageQuestion,
  QuestionRootFolder,
  SampleSelect,
  ScratchOptionNo,
  ScratchOptionYes,
} from "../question";
import { CoreHookContext } from "../types";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW_V3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;

  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProjectV3") {
    getQuestionRes = await createProjectQuestionV3(inputs);
  } else if (method === "executeUserTaskV3") {
    const func = ctx.arguments[0] as Func;
    if (func.method === "addFeature") {
      getQuestionRes = await getQuestionsForAddFeature(inputs);
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
    TOOLS?.logProvider.info(
      `[core] success to run question model for ${method}, answers:${JSON.stringify(inputs)}`
    );
  }
  await next();
};

async function createProjectQuestionV3(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode(getCreateNewOrFromSampleQuestion(inputs.platform));

  // create new
  const root = new QTreeNode({ type: "group" });
  node.addChild(root);
  root.condition = { equals: ScratchOptionYes.id };

  // capabilities
  const capQuestion = createCapabilityQuestionPreview();
  const capNode = new QTreeNode(capQuestion);
  root.addChild(capNode);

  const triggerQuestion = createHostTypeTriggerQuestion(inputs.platform);
  const triggerNode = new QTreeNode(triggerQuestion);
  triggerNode.condition = { equals: NotificationOptionItem.id };
  capNode.addChild(triggerNode);

  // Language
  const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
  capNode.addChild(programmingLanguage);

  root.addChild(new QTreeNode(QuestionRootFolder));
  root.addChild(new QTreeNode(createAppNameQuestion()));

  // create from sample
  const sampleNode = new QTreeNode(SampleSelect);
  node.addChild(sampleNode);
  sampleNode.condition = { equals: ScratchOptionNo.id };
  sampleNode.addChild(new QTreeNode(QuestionRootFolder));
  return ok(node.trim());
}

// for demo only
async function getQuestionsForAddFeature(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const question: SingleSelectQuestion = {
    name: "feature",
    title: getLocalizedString("core.addFeatureQuestion.title"),
    type: "singleSelect",
    staticOptions: [AzureResourceSQLNewUI, BotOptionItem],
  };
  return ok(new QTreeNode(question));
}
