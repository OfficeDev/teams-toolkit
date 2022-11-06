// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  CLIPlatforms,
  ContextV3,
  err,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  traverse,
  UserError,
} from "@microsoft/teamsfx-api";
import { isCLIDotNetEnabled, isPreviewFeaturesEnabled } from "../../common/featureFlags";
import { AppStudioScopes, deepCopy, isExistingTabAppEnabled } from "../../common/tools";
import { getSPFxScaffoldQuestion } from "../../component/feature/spfx";
import { getNotificationTriggerQuestionNode } from "../../component/question";
import {
  BotOptionItem,
  ExistingTabOptionItem,
  TabNewUIOptionItem,
  TabSPFxItem,
} from "../../component/constants";
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
  tabContentUrlQuestion,
  tabsContentUrlQuestion,
  tabsWebsitetUrlQuestion,
  tabWebsiteUrlQuestion,
} from "../question";
import { CoreHookContext } from "../types";
import {
  isPersonalApp,
  needTabCode,
  shouldSkipAskForCapability,
} from "../../component/resource/appManifest/utils/utils";
import { convertToAlphanumericOnly } from "../../common/utils";
import { AppDefinition } from "../../component/resource/appManifest/interfaces/appDefinition";

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
  const node = new QTreeNode(
    getCreateNewOrFromSampleQuestion(inputs.platform, !!inputs.teamsAppFromTdp)
  );

  // create new
  const createNew = new QTreeNode({ type: "group" });
  node.addChild(createNew);
  createNew.condition = { equals: ScratchOptionYes.id };

  // capabilities
  if (!shouldSkipAskForCapability(inputs.teamsAppFromTdp)) {
    let capNode: QTreeNode;
    if (isPreviewFeaturesEnabled()) {
      const capQuestion = createCapabilityQuestionPreview(inputs);
      capNode = new QTreeNode(capQuestion);
    } else {
      const capQuestion = createCapabilityQuestion();
      capNode = new QTreeNode(capQuestion);
    }

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
  } else {
    // Skip ask for capability if user have added features for the teams app in Developer Portal.
    // Only basic tab or bot capability are supported.
    const programmingLanguageNode = new QTreeNode(ProgrammingLanguageQuestion);
    createNew.addChild(programmingLanguageNode);
  }

  createNew.addChild(new QTreeNode(QuestionRootFolder));
  const defaultName = !inputs.teamsAppFromTdp?.appName
    ? undefined
    : convertToAlphanumericOnly(inputs.teamsAppFromTdp?.appName);
  createNew.addChild(new QTreeNode(createAppNameQuestion(defaultName)));

  if (!!inputs.teamsAppFromTdp) {
    //const updateTabUrls = await getQuestionsForUpdateTabUrls(inputs.teamsAppFromTdp);
    const updateTabUrls = await getQuestionsForUpdateStaticTabUrls(inputs.teamsAppFromTdp);
    if (updateTabUrls) {
      createNew.addChild(updateTabUrls);
    }
  }
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

async function getQuestionsForUpdateTabUrls(
  appDefinition: AppDefinition
): Promise<QTreeNode | undefined> {
  if (!isPersonalApp(appDefinition)) {
    return undefined;
  }

  const updateTabUrls = new QTreeNode({ type: "group" });
  for (let index = 0; index < appDefinition.staticTabs!.length; index++) {
    const webSiteUrl = appDefinition.staticTabs![index].websiteUrl;
    const contentUrl = appDefinition.staticTabs![index].contentUrl;
    if (webSiteUrl) {
      updateTabUrls.addChild(
        new QTreeNode(
          tabWebsiteUrlQuestion(
            appDefinition.staticTabs![index].websiteUrl,
            appDefinition.staticTabs![index].name
          )
        )
      );
    }
    if (contentUrl) {
      updateTabUrls.addChild(
        new QTreeNode(
          tabContentUrlQuestion(
            appDefinition.staticTabs![index].contentUrl,
            appDefinition.staticTabs![index].name
          )
        )
      );
    }
  }

  return updateTabUrls;
}

// V2 I wrote
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

export async function getQuestionsForCreateProjectV2(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (isCLIDotNetEnabled() && CLIPlatforms.includes(inputs.platform)) {
    return getQuestionsForCreateProjectWithDotNet(inputs);
  } else {
    return getQuestionsForCreateProjectWithoutDotNet(inputs);
  }
}
