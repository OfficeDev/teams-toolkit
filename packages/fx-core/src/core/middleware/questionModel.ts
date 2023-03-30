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
  Void,
} from "@microsoft/teamsfx-api";
import {
  isCLIDotNetEnabled,
  isOfficeAddinEnabled,
  isPreviewFeaturesEnabled,
} from "../../common/featureFlags";
import { deepCopy, isExistingTabAppEnabled, isV3Enabled } from "../../common/tools";
import { getSPFxScaffoldQuestion } from "../../component/feature/spfx";
import { getNotificationTriggerQuestionNode } from "../../component/question";
import { ExistingTabOptionItem, TabSPFxItem } from "../../component/constants";
import { getQuestionsForGrantPermission, getQuestionsForListCollaborator } from "../collaborator";
import { getQuestionForDeployAadManifest } from "../question";
import { TOOLS } from "../globalVars";
import {
  BotIdsQuestion,
  CoreQuestionNames,
  createAppNameQuestion,
  createCapabilityForDotNet,
  createCapabilityForOfficeAddin,
  createCapabilityQuestion,
  createCapabilityQuestionPreview,
  CreateNewOfficeAddinOption,
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
  ScratchOptionYesVSC,
  tabsContentUrlQuestion,
  tabsWebsitetUrlQuestion,
} from "../question";
import { CoreHookContext } from "../types";
import { isPersonalApp, needBotCode } from "../../component/resource/appManifest/utils/utils";
import { convertToAlphanumericOnly } from "../../common/utils";
import { AppDefinition } from "../../component/resource/appManifest/interfaces/appDefinition";
import { getQuestionsForScaffolding } from "../../component/generator/officeAddin/question";
import { getTemplateId, isFromDevPortal } from "../../component/developerPortalScaffoldUtils";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;
  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "grantPermission") {
    getQuestionRes = await getQuestionsForGrantPermission(inputs);
  } else if (isV3Enabled() && (method === "listCollaborator" || method == "checkPermission")) {
    getQuestionRes = await getQuestionsForListCollaborator(inputs);
  } else if (isV3Enabled() && method === "deployAadManifest") {
    getQuestionRes = await getQuestionForDeployAadManifest(inputs);
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
  if (isFromDevPortal(inputs)) {
    // If toolkit is activated by a request from Developer Portal, we will always create a project from scratch.
    inputs[CoreQuestionNames.CreateFromScratch] = ScratchOptionYesVSC().id;
    inputs[CoreQuestionNames.Capabilities] =
      inputs[CoreQuestionNames.Capabilities] ?? getTemplateId(inputs.teamsAppFromTdp);
  }
  const node = new QTreeNode(getCreateNewOrFromSampleQuestion(inputs.platform));

  // create new
  const createNew = new QTreeNode({ type: "group" });
  node.addChild(createNew);
  createNew.condition = { equals: ScratchOptionYes().id };

  // capabilities
  let capNode: QTreeNode;
  if (isPreviewFeaturesEnabled()) {
    const capQuestion = createCapabilityQuestionPreview(inputs);
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
  const spfxNode = await getSPFxScaffoldQuestion(inputs.platform);
  if (spfxNode) {
    spfxNode.condition = { equals: TabSPFxItem().id };
    capNode.addChild(spfxNode);
  }
  // Language
  const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
  if (isPreviewFeaturesEnabled()) {
    programmingLanguage.condition = {
      notEquals: ExistingTabOptionItem().id,
    };
  } else {
    programmingLanguage.condition = {
      minItems: 1,
      excludes: ExistingTabOptionItem().id,
    };
  }
  capNode.addChild(programmingLanguage);

  // existing tab endpoint
  if (isExistingTabAppEnabled()) {
    const existingTabEndpoint = new QTreeNode(ExistingTabEndpointQuestion());
    existingTabEndpoint.condition = {
      equals: ExistingTabOptionItem().id,
    };
    capNode.addChild(existingTabEndpoint);
  }

  createNew.addChild(new QTreeNode(QuestionRootFolder()));
  const defaultName = !inputs.teamsAppFromTdp?.appName
    ? undefined
    : convertToAlphanumericOnly(inputs.teamsAppFromTdp?.appName);
  createNew.addChild(new QTreeNode(createAppNameQuestion(defaultName)));

  if (isFromDevPortal(inputs)) {
    const updateTabUrls = await getQuestionsForUpdateStaticTabUrls(inputs.teamsAppFromTdp);
    if (updateTabUrls) {
      createNew.addChild(updateTabUrls);
    }

    const updateBotIds = await getQuestionsForUpdateBotIds(inputs.teamsAppFromTdp);
    if (updateBotIds) {
      createNew.addChild(updateBotIds);
    }
  }
  // create from sample
  const sampleNode = new QTreeNode(SampleSelect());
  node.addChild(sampleNode);
  sampleNode.condition = { equals: ScratchOptionNo().id };
  sampleNode.addChild(new QTreeNode(QuestionRootFolder()));

  if (isOfficeAddinEnabled()) {
    addOfficeAddinQuestions(node);
  }

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
      equals: RuntimeOptionNodeJs().id,
    };
    runtimeNode.addChild(node);
  }

  const dotnetNode = new QTreeNode({ type: "group" });
  dotnetNode.condition = {
    equals: RuntimeOptionDotNet().id,
  };
  runtimeNode.addChild(dotnetNode);

  const dotnetCapNode = new QTreeNode(createCapabilityForDotNet());
  dotnetNode.addChild(dotnetCapNode);

  const triggerNodeRes = await getNotificationTriggerQuestionNode(inputs);
  if (triggerNodeRes.isErr()) return err(triggerNodeRes.error);
  if (triggerNodeRes.value) {
    dotnetCapNode.addChild(triggerNodeRes.value);
  }
  const spfxNode = await getSPFxScaffoldQuestion(inputs.platform);
  if (spfxNode) {
    spfxNode.condition = { equals: TabSPFxItem().id };
    dotnetCapNode.addChild(spfxNode);
  }

  dotnetCapNode.addChild(new QTreeNode(ProgrammingLanguageQuestionForDotNet));

  // only CLI need folder input
  if (CLIPlatforms.includes(inputs.platform)) {
    runtimeNode.addChild(new QTreeNode(QuestionRootFolder()));
  }
  runtimeNode.addChild(new QTreeNode(createAppNameQuestion()));

  return ok(runtimeNode.trim());
}

async function getQuestionsForUpdateStaticTabUrls(
  appDefinition: AppDefinition
): Promise<QTreeNode | undefined> {
  if (!isPersonalApp(appDefinition)) {
    return undefined;
  }

  const updateTabUrls = new QTreeNode({ type: "group" });
  const tabs = appDefinition.staticTabs!;
  const tabsWithContentUrls = tabs.filter((o) => !!o.contentUrl);
  const tabsWithWebsiteUrls = tabs.filter((o) => !!o.websiteUrl);
  if (tabsWithWebsiteUrls.length > 0) {
    updateTabUrls.addChild(new QTreeNode(tabsWebsitetUrlQuestion(tabsWithWebsiteUrls)));
  }

  if (tabsWithContentUrls.length > 0) {
    updateTabUrls.addChild(new QTreeNode(tabsContentUrlQuestion(tabsWithContentUrls)));
  }

  return updateTabUrls;
}

async function getQuestionsForUpdateBotIds(
  appDefinition: AppDefinition
): Promise<QTreeNode | undefined> {
  if (!needBotCode(appDefinition)) {
    return undefined;
  }
  const bots = appDefinition.bots;
  const messageExtensions = appDefinition.messagingExtensions;

  // can add only one bot. If existing, the length is 1.
  const botId = !!bots && bots.length > 0 ? bots![0].botId : undefined;
  // can add only one message extension. If existing, the length is 1.
  const messageExtensionId =
    !!messageExtensions && messageExtensions.length > 0 ? messageExtensions![0].botId : undefined;

  return new QTreeNode(BotIdsQuestion(botId, messageExtensionId));
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

export function addOfficeAddinQuestions(node: QTreeNode): void {
  const createNewAddin = new QTreeNode({ type: "group" });
  createNewAddin.condition = { equals: CreateNewOfficeAddinOption().id };
  node.addChild(createNewAddin);

  const capNode = new QTreeNode(createCapabilityForOfficeAddin());
  createNewAddin.addChild(capNode);

  capNode.addChild(getQuestionsForScaffolding());

  createNewAddin.addChild(new QTreeNode(QuestionRootFolder()));
  createNewAddin.addChild(new QTreeNode(createAppNameQuestion()));
}
