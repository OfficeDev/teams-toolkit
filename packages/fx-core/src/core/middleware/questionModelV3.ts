// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import {
  CLIPlatforms,
  DynamicPlatforms,
  err,
  FxError,
  Inputs,
  ok,
  OptionItem,
  Platform,
  Plugin,
  ProjectSettingsV3,
  QTreeNode,
  Result,
  SingleSelectQuestion,
  Stage,
  traverse,
  UserError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import Container from "typedi";
import { isVSProject } from "../../common/projectSettingsHelper";
import { HelpLinks } from "../../common/constants";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import {
  hasAAD,
  hasAPIM,
  hasAzureResourceV3,
  hasBot,
  hasApi,
  hasKeyVault,
  hasTab,
} from "../../common/projectSettingsHelperV3";
import { canAddCICDWorkflows } from "../../common/tools";
import { ComponentNames } from "../../component/constants";
import { ComponentName2pluginName } from "../../component/migrate";
import { readAppManifest } from "../../component/resource/appManifest/utils";
import { getComponent } from "../../component/workflow";
import { STATIC_TABS_MAX_ITEMS } from "../../plugins/resource/appstudio/constants";
import { createHostTypeTriggerQuestion } from "../../plugins/resource/bot/question";
import {
  ApiConnectionOptionItem,
  AzureResourceApimNewUI,
  AzureResourceFunctionNewUI,
  AzureResourceKeyVaultNewUI,
  AzureResourceSQLNewUI,
  BotNewUIOptionItem,
  CicdOptionItem,
  CommandAndResponseOptionItem,
  DeployPluginSelectQuestion,
  MessageExtensionItem,
  MessageExtensionNewUIItem,
  NotificationOptionItem,
  SingleSignOnOptionItem,
  TabNewUIOptionItem,
  TabNonSsoItem,
} from "../../plugins/solution/fx-solution/question";
import { getPluginCLIName } from "../../plugins/solution/fx-solution/v2/getQuestions";
import { checkWetherProvisionSucceeded } from "../../plugins/solution/fx-solution/v2/utils";
import { NoCapabilityFoundError } from "../error";
import { TOOLS } from "../globalVars";
import { ProgrammingLanguageQuestion } from "../question";
import { CoreHookContext } from "../types";
import { getQuestionsForTargetEnv } from "./envInfoLoader";
import { getQuestionsForCreateProjectV2 } from "./questionModel";

/**
 * This middleware will help to collect input from question flow
 */
export const QuestionModelMW_V3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs: Inputs = ctx.arguments[ctx.arguments.length - 1];
  const method = ctx.method;

  let getQuestionRes: Result<QTreeNode | undefined, FxError> = ok(undefined);
  if (method === "createProjectV3") {
    getQuestionRes = await getQuestionsForCreateProjectV2(inputs);
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

async function getQuestionsForDeploy(
  ctx: v2.Context,
  envInfo: v3.EnvInfoV3,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  //VS project has no selection interaction, and will deploy all selectable components by default.
  if (isVSProject(ctx.projectSetting)) {
    return ok(undefined);
  }
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  const projectSetting = ctx.projectSetting as ProjectSettingsV3;
  const deployableComponents = [
    ComponentNames.TeamsTab,
    ComponentNames.TeamsBot,
    ComponentNames.TeamsApi,
    ComponentNames.APIM,
    ComponentNames.AppManifest,
  ];
  let selectableComponents: string[];
  if (!isDynamicQuestion) {
    selectableComponents = deployableComponents;
  } else {
    const hasAzureResource = hasAzureResourceV3(projectSetting);
    const provisioned = checkWetherProvisionSucceeded(envInfo.state);
    if (hasAzureResource && !provisioned) {
      return err(
        new UserError({
          source: "Solution",
          name: "CannotDeployBeforeProvision",
          message: getDefaultString("core.deploy.FailedToDeployBeforeProvision"),
          displayMessage: getLocalizedString("core.deploy.FailedToDeployBeforeProvision"),
          helpLink: HelpLinks.WhyNeedProvision,
        })
      );
    }
    selectableComponents = projectSetting.components
      .filter((component) => component.deploy && deployableComponents.includes(component.name))
      .map((component) => component.name) as string[];
    if (CLIPlatforms.includes(inputs.platform)) {
      deployableComponents.push(ComponentNames.AppManifest);
    }
  }
  const options = selectableComponents.map((c) => {
    const pluginName = ComponentName2pluginName(c);
    const plugin = Container.get<Plugin>(pluginName);
    const item: OptionItem = {
      id: pluginName,
      label: plugin.displayName,
      cliName: getPluginCLIName(plugin.name),
    };
    return item;
  });
  if (options.length === 0) {
    return err(new NoCapabilityFoundError(Stage.deploy));
  }
  const selectQuestion = DeployPluginSelectQuestion;
  selectQuestion.staticOptions = options;
  selectQuestion.default = options.map((i) => i.id);
  return ok(new QTreeNode(selectQuestion));
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
  if (inputs.platform === Platform.CLI_HELP) {
    options.push(NotificationOptionItem);
    options.push(CommandAndResponseOptionItem);
    options.push(BotNewUIOptionItem);
    options.push(TabNewUIOptionItem, TabNonSsoItem);
    options.push(MessageExtensionNewUIItem);
    options.push(AzureResourceApimNewUI);
    options.push(AzureResourceSQLNewUI);
    options.push(AzureResourceFunctionNewUI);
    options.push(AzureResourceKeyVaultNewUI);
    options.push(SingleSignOnOptionItem);
    options.push(ApiConnectionOptionItem);
    options.push(CicdOptionItem);
    const triggerNode = new QTreeNode(createHostTypeTriggerQuestion(inputs.platform));
    triggerNode.condition = { equals: NotificationOptionItem.id };
    const addFeatureNode = new QTreeNode(question);
    addFeatureNode.addChild(triggerNode);
    return ok(addFeatureNode);
  }
  // check capability options
  const manifestRes = await readAppManifest(inputs.projectPath!);
  if (manifestRes.isErr()) return err(manifestRes.error);
  const manifest = manifestRes.value;
  const canAddTab = manifest.staticTabs!.length < STATIC_TABS_MAX_ITEMS;
  const botExceedLimit = manifest.bots!.length > 0;
  const meExceedLimit = manifest.composeExtensions!.length > 0;
  const projectSettingsV3 = ctx.projectSetting as ProjectSettingsV3;
  const teamsBot = getComponent(ctx.projectSetting as ProjectSettingsV3, ComponentNames.TeamsBot);
  const alreadyHasNewBot =
    teamsBot?.capabilities?.includes("notification") ||
    teamsBot?.capabilities?.includes("command-response");
  if (!botExceedLimit && !alreadyHasNewBot) {
    options.push(NotificationOptionItem);
    options.push(CommandAndResponseOptionItem);
    options.push(BotNewUIOptionItem);
  }
  if (canAddTab) {
    if (!hasTab(projectSettingsV3)) {
      options.push(TabNewUIOptionItem, TabNonSsoItem);
    } else {
      options.push(hasAAD(projectSettingsV3) ? TabNewUIOptionItem : TabNonSsoItem);
    }
  }
  if (!meExceedLimit && !alreadyHasNewBot) {
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
  if (hasBot(projectSettingsV3) || hasApi(projectSettingsV3)) {
    options.push(ApiConnectionOptionItem);
  }
  // function can always be added
  options.push(AzureResourceFunctionNewUI);
  const isCicdAddable = await canAddCICDWorkflows(inputs, ctx);
  if (isCicdAddable) {
    options.push(CicdOptionItem);
  }
  question.staticOptions = options;
  const addFeatureNode = new QTreeNode(question);
  const triggerNode = new QTreeNode(createHostTypeTriggerQuestion(inputs.platform));
  triggerNode.condition = { equals: NotificationOptionItem.id };
  addFeatureNode.addChild(triggerNode);
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
