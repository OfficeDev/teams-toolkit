// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  DynamicPlatforms,
  err,
  Func,
  FxError,
  Inputs,
  MultiSelectQuestion,
  ok,
  OptionItem,
  ProjectSettingsV3,
  QTreeNode,
  Result,
  SingleSelectQuestion,
  Stage,
  TeamsAppManifest,
  traverse,
  UserError,
  v2,
} from "@microsoft/teamsfx-api";
import { EnvInfoV3 } from "@microsoft/teamsfx-api/build/v3";
import fs from "fs-extra";
import * as path from "path";
import { HelpLinks } from "../../common/constants";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import {
  hasAAD,
  hasAPIM,
  hasAzureResourceV3,
  hasBot,
  hasFunction,
  hasKeyVault,
  hasTab,
} from "../../common/projectSettingsHelperV3";
import { canAddCICDWorkflows, getAppDirectory } from "../../common/tools";
import {
  MANIFEST_TEMPLATE_CONSOLIDATE,
  STATIC_TABS_MAX_ITEMS,
} from "../../plugins/resource/appstudio/constants";
import { createHostTypeTriggerQuestion } from "../../plugins/resource/bot/question";
import {
  ApiConnectionOptionItem,
  AzureResourceApimNewUI,
  AzureResourceKeyVaultNewUI,
  AzureResourceSQLNewUI,
  BotNewUIOptionItem,
  CicdOptionItem,
  CommandAndResponseOptionItem,
  MessageExtensionItem,
  MessageExtensionNewUIItem,
  NotificationOptionItem,
  SingleSignOnOptionItem,
  TabNewUIOptionItem,
  TabNonSsoItem,
} from "../../plugins/solution/fx-solution/question";
import { checkWetherProvisionSucceeded } from "../../plugins/solution/fx-solution/v2/utils";
import { NoCapabilityFoundError } from "../error";
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
import { getQuestionsForTargetEnv } from "./envInfoLoader";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW_V3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;

  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProjectV3") {
    getQuestionRes = await createProjectQuestionV3(inputs);
  } else if (method === "provisionResourcesV3") {
    getQuestionRes = await getQuestionsForTargetEnv(inputs);
  } else if (method === "deployArtifactsV3") {
    getQuestionRes = await getQuestionsForDeploy(ctx.contextV2!, ctx.envInfoV3!, inputs);
  } else if (method === "addFeature") {
    getQuestionRes = await getQuestionsForAddFeature(ctx.contextV2!, inputs);
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

async function getQuestionsForDeploy(
  ctx: v2.Context,
  envInfo: EnvInfoV3,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  const projectSetting = ctx.projectSetting as ProjectSettingsV3;
  if (isDynamicQuestion) {
    const hasAzureResource = hasAzureResourceV3(projectSetting);
    const provisioned = checkWetherProvisionSucceeded(envInfo.state);
    if (hasAzureResource && !provisioned) {
      return err(
        new UserError({
          source: "fx",
          name: "CannotDeployBeforeProvision",
          message: getDefaultString("core.deploy.FailedToDeployBeforeProvision"),
          displayMessage: getLocalizedString("core.deploy.FailedToDeployBeforeProvision"),
          helpLink: HelpLinks.WhyNeedProvision,
        })
      );
    }
    const selectComponentsQuestion: MultiSelectQuestion = {
      name: "deploy-plugin",
      title: "Select component(s) to deploy",
      type: "multiSelect",
      skipSingleOption: false,
      staticOptions: [],
      default: [],
    };
    selectComponentsQuestion.staticOptions = projectSetting.components
      .filter((component) => component.build && component.hosting)
      .map((component) => {
        const item: OptionItem = {
          id: component.name,
          label: component.name,
          cliName: component.name,
        };
        return item;
      });
    if (selectComponentsQuestion.staticOptions.length === 0) {
      return err(new NoCapabilityFoundError(Stage.deploy));
    }
    return ok(new QTreeNode(selectComponentsQuestion));
  }
  return ok(undefined);
}

async function getQuestionsForAddFeature(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const question: SingleSelectQuestion = {
    name: "feature",
    title: getLocalizedString("core.addFeatureQuestion.title"),
    type: "singleSelect",
    staticOptions: [],
  };
  const options: OptionItem[] = [];
  // check capability options
  const appDir = await getAppDirectory(inputs.projectPath!);
  const manifestPath = path.resolve(appDir, MANIFEST_TEMPLATE_CONSOLIDATE);
  const manifest = (await fs.readJson(manifestPath)) as TeamsAppManifest;
  const canAddTab = manifest.staticTabs!.length < STATIC_TABS_MAX_ITEMS;
  const canAddBot = manifest.bots!.length < 1;
  const canAddME = manifest.composeExtensions!.length < 1;
  const projectSettingsV3 = ctx.projectSetting as ProjectSettingsV3;
  if (canAddBot) {
    options.push(NotificationOptionItem);
    options.push(CommandAndResponseOptionItem);
  }
  if (canAddTab) {
    if (hasTab(projectSettingsV3)) {
      options.push(TabNewUIOptionItem, TabNonSsoItem);
    } else {
      //if aad is added, display name is SsoTab, otherwise the display name is NonSsoTab
      if (hasAAD(projectSettingsV3)) {
        options.push(TabNewUIOptionItem);
      } else {
        options.push(TabNonSsoItem);
      }
    }
  }
  if (canAddBot) {
    options.push(BotNewUIOptionItem);
  }
  if (canAddME) {
    options.push(MessageExtensionNewUIItem);
  }
  // check cloud resource options
  if (!hasAPIM(projectSettingsV3)) {
    options.push(AzureResourceApimNewUI);
  }
  options.push(AzureResourceSQLNewUI);
  if (!hasKeyVault(projectSettingsV3)) {
    options.push(AzureResourceKeyVaultNewUI);
  }
  if (!hasAAD(projectSettingsV3)) {
    options.push(SingleSignOnOptionItem);
  }
  if (hasBot(projectSettingsV3) || hasFunction(projectSettingsV3)) {
    options.push(ApiConnectionOptionItem);
  }
  const isCicdAddable = await canAddCICDWorkflows(inputs, ctx);
  if (isCicdAddable) {
    options.push(CicdOptionItem);
  }
  question.staticOptions = options;
  const addFeatureNode = new QTreeNode(question);
  if (!ctx.projectSetting.programmingLanguage) {
    // Language
    const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
    programmingLanguage.condition = {
      enum: [
        NotificationOptionItem.id,
        CommandAndResponseOptionItem.id,
        TabNewUIOptionItem.id,
        TabNonSsoItem.id,
        BotNewUIOptionItem.id,
        MessageExtensionItem.id,
        SingleSignOnOptionItem.id, // adding sso means adding sample codes
      ],
    };
    addFeatureNode.addChild(programmingLanguage);
  }
  return ok(addFeatureNode);
}
