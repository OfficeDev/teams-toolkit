// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  CLIPlatforms,
  FxError,
  Inputs,
  Platform,
  QTreeNode,
  Result,
  err,
  ok,
} from "@microsoft/teamsfx-api";

import { isCLIDotNetEnabled, isOfficeAddinEnabled } from "../../common/featureFlags";
import { convertToAlphanumericOnly } from "../../common/utils";
import {
  NewProjectTypeBotOptionItem,
  NewProjectTypeMessageExtensionOptionItem,
  NewProjectTypeOutlookAddinOptionItem,
  NewProjectTypeTabOptionItem,
  TabSPFxItem,
} from "../../component/constants";
import { getTemplateId, isFromDevPortal } from "../../component/developerPortalScaffoldUtils";
import { getQuestionsForScaffolding } from "../../component/generator/officeAddin/question";
import {
  getNotificationTriggerQuestionNode,
  getSPFxScaffoldQuestion,
} from "../../component/question";
import { AppDefinition } from "../../component/resource/appManifest/interfaces/appDefinition";
import { isPersonalApp, needBotCode } from "../../component/resource/appManifest/utils/utils";
import { getQuestionsForGrantPermission, getQuestionsForListCollaborator } from "../collaborator";
import { TOOLS } from "../globalVars";
import {
  BotIdsQuestion,
  CoreQuestionNames,
  CreateNewOfficeAddinOption,
  ProgrammingLanguageQuestion,
  ProgrammingLanguageQuestionForDotNet,
  QuestionRootFolder,
  RuntimeOptionDotNet,
  RuntimeOptionNodeJs,
  SampleSelect,
  ScratchOptionNo,
  ScratchOptionNoVSC,
  ScratchOptionYes,
  ScratchOptionYesVSC,
  createAppNameQuestion,
  createCapabilityForDotNet,
  createCapabilityForOfficeAddin,
  createCapabilityQuestionPreview,
  createNewProjectQuestionWith2Layers,
  getBotProjectQuestionNode,
  getCreateNewOrFromSampleQuestion,
  getMessageExtensionTypeProjectQuestionNode,
  getOutlookAddinTypeProjectQuestionNode,
  getQuestionForDeployAadManifest,
  getRuntimeQuestion,
  getTabTypeProjectQuestionNode,
  tabsContentUrlQuestion,
  tabsWebsitetUrlQuestion,
} from "../question";
import { CoreHookContext } from "../types";
import { traverse } from "../../ui/visitor";
import { skipAppName } from "../../component/generator/spfx/utils/questions";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;
  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "grantPermission") {
    getQuestionRes = await getQuestionsForGrantPermission(inputs);
  } else if (method === "listCollaborator" || method == "checkPermission") {
    getQuestionRes = await getQuestionsForListCollaborator(inputs);
  } else if (method === "deployAadManifest") {
    getQuestionRes = await getQuestionForDeployAadManifest(inputs);
  }

  if (getQuestionRes.isErr()) {
    TOOLS?.logProvider.error(
      `[core] failed to get questions for ${method}: ${getQuestionRes.error.message}`
    );
    ctx.result = err(getQuestionRes.error);
    return;
  }
  const node = getQuestionRes.value;
  if (node) {
    const res = await traverse(node, inputs, TOOLS.ui, TOOLS.telemetryReporter);
    if (res.isErr()) {
      ctx.result = err(res.error);
      return;
    }
  }
  await next();
};

async function getQuestionsForCreateProjectWithoutDotNet(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (isFromDevPortal(inputs)) {
    // If toolkit is activated by a request from Developer Portal, we will always create a project from scratch.
    inputs[CoreQuestionNames.CreateFromScratch] = ScratchOptionYesVSC().id;
    inputs[CoreQuestionNames.Capabilities] =
      inputs[CoreQuestionNames.Capabilities] ?? getTemplateId(inputs.teamsAppFromTdp)?.templateId;
  }
  const node = new QTreeNode(getCreateNewOrFromSampleQuestion(inputs.platform));

  // create new
  const createNew = new QTreeNode({ type: "group" });
  node.addChild(createNew);
  createNew.condition = { equals: ScratchOptionYes().id };

  // capabilities
  const capQuestion = createCapabilityQuestionPreview(inputs);
  const capNode = new QTreeNode(capQuestion);

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
  capNode.addChild(programmingLanguage);

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

async function getQuestionsForCreateProjectInVSC(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (inputs[CoreQuestionNames.CreateFromScratch] === ScratchOptionNoVSC().id) {
    // Create from sample flow
    const sampleNode = new QTreeNode(SampleSelect());
    sampleNode.addChild(new QTreeNode(QuestionRootFolder()));

    return ok(sampleNode.trim());
  }

  // We will always create a project from scratch in VSC.
  inputs[CoreQuestionNames.CreateFromScratch] = ScratchOptionYesVSC().id;
  if (isFromDevPortal(inputs)) {
    inputs[CoreQuestionNames.ProjectType] =
      inputs[CoreQuestionNames.ProjectType] ?? getTemplateId(inputs.teamsAppFromTdp)?.projectType;
    inputs[CoreQuestionNames.Capabilities] =
      inputs[CoreQuestionNames.Capabilities] ?? getTemplateId(inputs.teamsAppFromTdp)?.templateId;
  }

  // create new project root
  const root = new QTreeNode({ type: "group" });

  // project type
  const capQuestion = createNewProjectQuestionWith2Layers(inputs);
  const typeNode = new QTreeNode(capQuestion);
  root.addChild(typeNode);

  // bot type capabilities
  const botTypeNode = new QTreeNode(getBotProjectQuestionNode(inputs));
  botTypeNode.condition = {
    equals: NewProjectTypeBotOptionItem().id,
  };
  typeNode.addChild(botTypeNode);

  const triggerNodeRes = await getNotificationTriggerQuestionNode(inputs);
  if (triggerNodeRes.isErr()) return err(triggerNodeRes.error);
  if (triggerNodeRes.value) {
    botTypeNode.addChild(triggerNodeRes.value);
  }

  // tab type
  const tabTypeNode = new QTreeNode(getTabTypeProjectQuestionNode(inputs));
  tabTypeNode.condition = {
    equals: NewProjectTypeTabOptionItem().id,
  };
  typeNode.addChild(tabTypeNode);

  const spfxNode = await getSPFxScaffoldQuestion(inputs.platform);
  if (spfxNode) {
    spfxNode.condition = { equals: TabSPFxItem().id };
    tabTypeNode.addChild(spfxNode);
  }

  // message extension type
  const messageExtensionTypeNode = new QTreeNode(
    getMessageExtensionTypeProjectQuestionNode(inputs)
  );
  messageExtensionTypeNode.condition = {
    equals: NewProjectTypeMessageExtensionOptionItem().id,
  };
  typeNode.addChild(messageExtensionTypeNode);

  // Outlook addin type
  const outlookAddinTypeNode = new QTreeNode(getOutlookAddinTypeProjectQuestionNode(inputs));
  outlookAddinTypeNode.condition = {
    equals: NewProjectTypeOutlookAddinOptionItem().id,
  };
  typeNode.addChild(outlookAddinTypeNode);
  outlookAddinTypeNode.addChild(getQuestionsForScaffolding());

  // Language
  const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
  programmingLanguage.condition = {
    notEquals: NewProjectTypeOutlookAddinOptionItem().id,
  };
  typeNode.addChild(programmingLanguage);

  root.addChild(new QTreeNode(QuestionRootFolder()));
  const defaultName = !inputs.teamsAppFromTdp?.appName
    ? undefined
    : convertToAlphanumericOnly(inputs.teamsAppFromTdp?.appName);
  root.addChild(new QTreeNode(skipAppName));
  root.addChild(new QTreeNode(createAppNameQuestion(defaultName)));

  if (isFromDevPortal(inputs)) {
    const updateTabUrls = await getQuestionsForUpdateStaticTabUrls(inputs.teamsAppFromTdp);
    if (updateTabUrls) {
      typeNode.addChild(updateTabUrls);
    }

    const updateBotIds = await getQuestionsForUpdateBotIds(inputs.teamsAppFromTdp);
    if (updateBotIds) {
      typeNode.addChild(updateBotIds);
    }
  }

  return ok(root.trim());
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
  } else if (inputs.platform === Platform.VSCode) {
    return getQuestionsForCreateProjectInVSC(inputs);
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
