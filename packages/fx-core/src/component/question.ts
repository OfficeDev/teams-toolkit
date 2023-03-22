// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AppPackageFolderName,
  CLIPlatforms,
  ContextV3,
  DynamicPlatforms,
  err,
  FolderQuestion,
  FuncQuestion,
  FxError,
  Inputs,
  InputsWithProjectPath,
  Json,
  MultiSelectQuestion,
  ok,
  OptionItem,
  Platform,
  ProjectSettingsV3,
  QTreeNode,
  ResourceContextV3,
  Result,
  SingleFileQuestion,
  SingleSelectQuestion,
  Stage,
  TextInputQuestion,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { isVSProject } from "../common/projectSettingsHelper";
import { HelpLinks, ResourcePlugins } from "../common/constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import {
  hasAAD,
  hasAPIM,
  hasAzureResourceV3,
  hasBot,
  hasApi,
  hasKeyVault,
  hasTab,
} from "../common/projectSettingsHelperV3";
import { canAddCICDWorkflows } from "../common/tools";
import {
  ApiConnectionOptionItem,
  AzureResourceApim,
  AzureResourceApimNewUI,
  AzureResourceFunction,
  AzureResourceFunctionNewUI,
  AzureResourceKeyVault,
  AzureResourceKeyVaultNewUI,
  AzureResourceSQL,
  AzureResourceSQLNewUI,
  AzureSolutionQuestionNames,
  BotFeatureIds,
  BotNewUIOptionItem,
  BotOptionItem,
  CicdOptionItem,
  CommandAndResponseOptionItem,
  ComponentNames,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  MessageExtensionNewUIItem,
  NotificationOptionItem,
  Runtime,
  SingleSignOnOptionItem,
  TabFeatureIds,
  TabNewUIOptionItem,
  TabNonSsoItem,
  TabOptionItem,
  TabSPFxNewUIItem,
  WorkflowOptionItem,
  BuiltInFeaturePluginNames,
  GLOBAL_CONFIG,
  SOLUTION_PROVISION_SUCCEEDED,
  SPFxQuestionNames,
} from "./constants";
import { ComponentName2pluginName } from "./migrate";
import { getComponent } from "./workflow";
import { STATIC_TABS_MAX_ITEMS, Constants as Constants1 } from "./resource/appManifest/constants";
import {
  createHostTypeTriggerQuestion,
  getConditionOfNotificationTriggerQuestion,
  showNotificationTriggerCondition,
} from "./feature/bot/question";
import { NoCapabilityFoundError } from "../core/error";
import {
  ProgrammingLanguageQuestion,
  selectTeamsAppManifestQuestion,
  selectTeamsAppPackageQuestion,
} from "../core/question";
import { createContextV3 } from "./utils";
import {
  isBotNotificationEnabled,
  isCLIDotNetEnabled,
  isSPFxMultiTabEnabled,
} from "../common/featureFlags";
import { buildQuestionNode } from "./resource/azureSql/questions";
import { ApiConnectorImpl } from "./feature/apiconnector/ApiConnectorImpl";
import {
  loadPackageVersions,
  spfxPackageSelectQuestion,
  webpartNameQuestion,
} from "./resource/spfx/utils/questions";
import { getQuestionsForDeployAPIM } from "./resource/apim/apim";
import { canAddSso } from "./feature/sso";
import { addCicdQuestion } from "./feature/cicd/cicd";
import { InvalidFeature } from "./error";
import { manifestUtils } from "./resource/appManifest/utils/ManifestUtils";
import { getAddSPFxQuestionNode } from "./feature/spfx";
import { Constants } from "./resource/aadApp/constants";
import { functionNameQuestion } from "./feature/api/question";
import path from "path";
import fs from "fs-extra";

export async function getQuestionsForProvisionV3(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (inputs.platform === Platform.CLI_HELP) {
    const node = new QTreeNode({ type: "group" });
    node.addChild(new QTreeNode(AskSubscriptionQuestion));
    node.addChild(buildQuestionNode());
    return ok(node);
  } else {
    // const node = new QTreeNode({ type: "group" });
    // if (hasAzureResourceV3(context.projectSetting as ProjectSettingsV3)) {
    //   node.addChild(new QTreeNode(AskSubscriptionQuestion));
    // }
    // return ok(node);
    return ok(undefined);
  }
}

export async function getQuestionsForDeployV3(
  ctx: ContextV3,
  inputs: Inputs,
  envInfo?: v3.EnvInfoV3
): Promise<Result<QTreeNode | undefined, FxError>> {
  //VS project has no selection interaction, and will deploy all selectable components by default.
  if (isVSProject(ctx.projectSetting)) {
    return ok(undefined);
  }
  if (inputs.platform === Platform.VSCode && inputs[Constants.INCLUDE_AAD_MANIFEST] === "yes") {
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
  const componentDisplayNames = {
    [ComponentNames.TeamsTab]: "NodeJS Tab frontend",
    [ComponentNames.TeamsBot]: "Bot",
    [ComponentNames.TeamsApi]: "Azure Function",
    [ComponentNames.APIM]: "API Management",
    [ComponentNames.AppManifest]: "App Studio",
    [ComponentNames.AadApp]: "AAD",
  };

  if (CLIPlatforms.includes(inputs.platform)) {
    deployableComponents.push(ComponentNames.AadApp);
  }

  let selectableComponents: string[];
  if (!isDynamicQuestion) {
    selectableComponents = deployableComponents;
  } else {
    const hasAzureResource = hasAzureResourceV3(projectSetting);
    const provisioned = checkWetherProvisionSucceeded(envInfo!.state);
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
      selectableComponents.push(ComponentNames.AppManifest);
    }
  }
  const options = selectableComponents.map((c) => {
    const pluginName = ComponentName2pluginName(c);
    const item: OptionItem = {
      id: pluginName,
      label: componentDisplayNames[c],
      cliName: getPluginCLIName(pluginName),
    };
    return item;
  });
  if (options.length === 0) {
    return err(new NoCapabilityFoundError(Stage.deploy));
  }
  const selectQuestion = DeployPluginSelectQuestion;
  selectQuestion.staticOptions = options;
  selectQuestion.default = options.map((i) => i.id);
  const node = new QTreeNode(selectQuestion);
  if (selectableComponents.includes(ComponentNames.APIM)) {
    const resourceContext = ctx as ContextV3;
    resourceContext.envInfo = envInfo;
    resourceContext.tokenProvider = ctx.tokenProvider;
    const apimDeployNodeRes = await getQuestionsForDeployAPIM(
      resourceContext as ResourceContextV3,
      inputs as InputsWithProjectPath
    );
    if (apimDeployNodeRes.isErr()) return err(apimDeployNodeRes.error);
    if (apimDeployNodeRes.value) {
      const apimNode = apimDeployNodeRes.value;
      apimNode.condition = { contains: BuiltInFeaturePluginNames.apim };
      node.addChild(apimNode);
    }
  }
  if (selectableComponents.includes(ComponentNames.AadApp)) {
    const aadNode = new QTreeNode({
      name: Constants.INCLUDE_AAD_MANIFEST,
      type: "singleSelect",
      staticOptions: ["yes", "no"],
      title: getLocalizedString("core.aad.includeAadQuestionTitle"),
      default: "no",
    });
    node.addChild(aadNode);
    if (CLIPlatforms.includes(inputs.platform)) {
      // this question only works on CLI.
      const aadManifestFilePathNode = new QTreeNode({
        name: Constants.AAD_MANIFEST_FILE,
        type: "singleFile",
        title: getLocalizedString("core.aad.aadManifestFilePath"),
        default: "",
      });
      node.addChild(aadManifestFilePathNode);
    }
  }
  if (selectableComponents.includes(ComponentNames.AppManifest)) {
    const appManifestNode = new QTreeNode({
      name: Constants1.INCLUDE_APP_MANIFEST,
      type: "singleSelect",
      staticOptions: ["yes", "no"],
      title: getLocalizedString("plugins.appstudio.whetherToDeployManifest"),
      default: "no",
    });
    node.addChild(appManifestNode);
  }
  return ok(node);
}
export function checkWetherProvisionSucceeded(config: Json): boolean {
  return config[GLOBAL_CONFIG] && config[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED];
}
export async function getQuestionsForAddFeatureV3(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const notificationOptionItem = NotificationOptionItem();
  const commandAndResponseOptionItem = CommandAndResponseOptionItem();
  const workflowOptionItem = WorkflowOptionItem();

  const question: SingleSelectQuestion = {
    name: AzureSolutionQuestionNames.Features,
    title: getLocalizedString("core.addFeatureQuestion.title"),
    type: "singleSelect",
    staticOptions: [],
  };
  const options: OptionItem[] = [];
  question.staticOptions = options;
  if (inputs.platform === Platform.CLI_HELP) {
    options.push(notificationOptionItem);
    options.push(commandAndResponseOptionItem);
    options.push(workflowOptionItem);
    options.push(BotNewUIOptionItem());
    options.push(TabNewUIOptionItem(), TabNonSsoItem());
    options.push(MessageExtensionNewUIItem());
    options.push(AzureResourceApimNewUI);
    options.push(AzureResourceSQLNewUI);
    options.push(AzureResourceFunctionNewUI);
    options.push(AzureResourceKeyVaultNewUI);
    options.push(SingleSignOnOptionItem);
    options.push(ApiConnectionOptionItem);
    options.push(CicdOptionItem);
    const addFeatureNode = new QTreeNode(question);
    const triggerNodeRes = await getNotificationTriggerQuestionNode(inputs);
    if (triggerNodeRes.isErr()) return err(triggerNodeRes.error);
    if (triggerNodeRes.value) {
      addFeatureNode.addChild(triggerNodeRes.value);
    }
    const functionNameNode = new QTreeNode(functionNameQuestion);
    functionNameNode.condition = { equals: AzureResourceFunctionNewUI.id };
    addFeatureNode.addChild(functionNameNode);
    return ok(addFeatureNode);
  }
  // check capability options
  const azureHost = hasAzureResourceV3(ctx.projectSetting as ProjectSettingsV3);
  if (azureHost) {
    const manifestRes = await manifestUtils.readAppManifest(inputs.projectPath!);
    if (manifestRes.isErr()) return err(manifestRes.error);
    const manifest = manifestRes.value;
    const canAddTab = !manifest.staticTabs || manifest.staticTabs.length < STATIC_TABS_MAX_ITEMS;
    const botExceedLimit = !manifest.bots || manifest.bots.length > 0;
    const meExceedLimit = !manifest.composeExtensions || manifest.composeExtensions.length > 0;
    const projectSettingsV3 = ctx.projectSetting as ProjectSettingsV3;
    const teamsBot = getComponent(ctx.projectSetting as ProjectSettingsV3, ComponentNames.TeamsBot);
    const alreadyHasNewBot =
      teamsBot?.capabilities?.includes("notification") ||
      teamsBot?.capabilities?.includes("command-response") ||
      teamsBot?.capabilities?.includes("workflow");
    if (!botExceedLimit && !meExceedLimit) {
      options.push(notificationOptionItem);
      options.push(commandAndResponseOptionItem);
      options.push(workflowOptionItem);
    }
    if (canAddTab) {
      if (!hasTab(projectSettingsV3)) {
        options.push(TabNewUIOptionItem(), TabNonSsoItem());
      } else {
        options.push(hasAAD(projectSettingsV3) ? TabNewUIOptionItem() : TabNonSsoItem());
      }
    }
    if (!botExceedLimit) {
      options.push(BotNewUIOptionItem());
    }
    if (!meExceedLimit && !alreadyHasNewBot) {
      options.push(MessageExtensionNewUIItem());
    }
    // function can always be added
    options.push(AzureResourceFunctionNewUI);
    // check cloud resource options
    if (!hasAPIM(projectSettingsV3)) {
      options.push(AzureResourceApimNewUI);
    }
    options.push(AzureResourceSQLNewUI);
    if (!hasKeyVault(projectSettingsV3)) {
      options.push(AzureResourceKeyVaultNewUI);
    }
    if (canAddSso(ctx.projectSetting as ProjectSettingsV3) === true) {
      options.push(SingleSignOnOptionItem);
    }
    if (hasBot(projectSettingsV3) || hasApi(projectSettingsV3)) {
      options.push(ApiConnectionOptionItem);
    }
  } else if (
    isSPFxMultiTabEnabled() &&
    ctx.projectSetting.solutionSettings?.hostType === HostTypeOptionSPFx().id
  ) {
    options.push(TabSPFxNewUIItem());
  }
  const isCicdAddable = await canAddCICDWorkflows(inputs, ctx);
  if (isCicdAddable) {
    options.push(CicdOptionItem);
  }
  const addFeatureNode = new QTreeNode(question);
  const functionNameNode = new QTreeNode(functionNameQuestion);
  functionNameNode.condition = { equals: AzureResourceFunctionNewUI.id };
  addFeatureNode.addChild(functionNameNode);
  const triggerNodeRes = await getNotificationTriggerQuestionNode(inputs);
  if (triggerNodeRes.isErr()) return err(triggerNodeRes.error);
  if (triggerNodeRes.value) {
    addFeatureNode.addChild(triggerNodeRes.value);
  }
  const addSPFxNodeRes = await getAddSPFxQuestionNode(inputs.projectPath);
  if (addSPFxNodeRes.isErr()) return err(addSPFxNodeRes.error);
  if (addSPFxNodeRes.value) {
    addFeatureNode.addChild(addSPFxNodeRes.value);
  }
  if (!ctx.projectSetting.programmingLanguage) {
    // Language
    const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
    programmingLanguage.condition = {
      enum: [
        notificationOptionItem.id,
        commandAndResponseOptionItem.id,
        workflowOptionItem.id,
        TabNewUIOptionItem().id,
        TabNonSsoItem().id,
        BotNewUIOptionItem().id,
        MessageExtensionItem().id,
        SingleSignOnOptionItem.id, // adding sso means adding sample codes
      ],
    };
    addFeatureNode.addChild(programmingLanguage);
  }
  const SelectedFeature: string = inputs[AzureSolutionQuestionNames.Features];
  if (SelectedFeature && !options.map((op) => op.id).includes(SelectedFeature)) {
    return err(new InvalidFeature());
  }
  return ok(addFeatureNode);
}

export async function getQuestionsForAddResourceV3(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const question: SingleSelectQuestion = {
    name: AzureSolutionQuestionNames.AddResources,
    title: getLocalizedString("core.addFeatureQuestion.title"),
    type: "singleSelect",
    staticOptions: [],
  };
  const options: OptionItem[] = [];
  question.staticOptions = options;
  if (inputs.platform === Platform.CLI_HELP) {
    options.push(AzureResourceApimNewUI);
    options.push(AzureResourceSQLNewUI);
    options.push(AzureResourceFunctionNewUI);
    options.push(AzureResourceKeyVaultNewUI);
    const addResourceNode = new QTreeNode(question);
    const functionNameNode = new QTreeNode(functionNameQuestion);
    functionNameNode.condition = { equals: AzureResourceFunctionNewUI.id };
    addResourceNode.addChild(functionNameNode);
    return ok(addResourceNode);
  }
  const projectSettingsV3 = ctx.projectSetting as ProjectSettingsV3;
  if (!hasAPIM(projectSettingsV3)) {
    options.push(AzureResourceApimNewUI);
  }
  options.push(AzureResourceSQLNewUI);
  if (!hasKeyVault(projectSettingsV3)) {
    options.push(AzureResourceKeyVaultNewUI);
  }
  // function can always be added
  options.push(AzureResourceFunctionNewUI);
  const addResourceNode = new QTreeNode(question);
  const functionNameNode = new QTreeNode(functionNameQuestion);
  functionNameNode.condition = { equals: AzureResourceFunctionNewUI.id };
  addResourceNode.addChild(functionNameNode);
  if (!ctx.projectSetting.programmingLanguage) {
    // Language
    const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
    programmingLanguage.condition = {
      enum: [
        NotificationOptionItem().id,
        CommandAndResponseOptionItem().id,
        WorkflowOptionItem().id,
        TabNewUIOptionItem().id,
        TabNonSsoItem().id,
        BotNewUIOptionItem().id,
        MessageExtensionItem().id,
        SingleSignOnOptionItem.id, // adding sso means adding sample codes
      ],
    };
    addResourceNode.addChild(programmingLanguage);
  }
  return ok(addResourceNode);
}

export enum FeatureId {
  Tab = "Tab",
  TabNonSso = "TabNonSso",
  TabSPFx = "TabSPFx",
  Notification = "Notification",
  CommandAndResponse = "command-bot",
  Workflow = "workflow-bot",
  Bot = "Bot",
  MessagingExtension = "MessagingExtension",
  function = "function",
  apim = "apim",
  sql = "sql",
  keyvault = "keyvault",
  sso = "sso",
  ApiConnector = "api-connection",
  cicd = "cicd",
  M365SearchApp = "M365SearchApp",
  M365SsoLaunchPage = "M365SsoLaunchPage",
}

export const FeatureIdToComponent = {
  [FeatureId.Tab]: ComponentNames.TeamsTab,
  [FeatureId.TabNonSso]: ComponentNames.TeamsTab,
  [FeatureId.TabSPFx]: ComponentNames.SPFxTab,
  [FeatureId.M365SsoLaunchPage]: ComponentNames.TeamsTab,
  [FeatureId.Notification]: ComponentNames.TeamsBot,
  [FeatureId.CommandAndResponse]: ComponentNames.TeamsBot,
  [FeatureId.Workflow]: ComponentNames.TeamsBot,
  [FeatureId.Bot]: ComponentNames.TeamsBot,
  [FeatureId.M365SearchApp]: ComponentNames.TeamsBot,
  [FeatureId.MessagingExtension]: ComponentNames.TeamsBot,
  [FeatureId.function]: ComponentNames.TeamsApi,
  [FeatureId.apim]: ComponentNames.APIMFeature,
  [FeatureId.sql]: ComponentNames.AzureSQL,
  [FeatureId.keyvault]: ComponentNames.KeyVault,
  [FeatureId.sso]: ComponentNames.SSO,
  [FeatureId.ApiConnector]: ComponentNames.ApiConnector,
  [FeatureId.cicd]: ComponentNames.CICD,
};

export function getActionNameByFeatureId(featureId: FeatureId): string | undefined {
  const component = FeatureIdToComponent[featureId];
  if (component) {
    return `${component}.add`;
  }
}

export async function getQuestionsForAddFeatureSubCommand(
  featureId: FeatureId,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (BotFeatureIds().includes(featureId)) {
    return await getNotificationTriggerQuestionNode(inputs);
  } else if (TabFeatureIds().includes(featureId)) {
  } else if (featureId === TabSPFxNewUIItem().id) {
    return ok(new QTreeNode(webpartNameQuestion));
  } else if (featureId === AzureResourceSQLNewUI.id) {
  } else if (
    featureId === AzureResourceFunctionNewUI.id ||
    featureId === AzureResourceApimNewUI.id
  ) {
    functionNameQuestion.validation = undefined;
    return ok(new QTreeNode(functionNameQuestion));
  } else if (featureId === AzureResourceKeyVaultNewUI.id) {
  } else if (featureId === CicdOptionItem.id) {
    return await addCicdQuestion(createContextV3(), inputs as InputsWithProjectPath);
  } else if (featureId === ApiConnectionOptionItem.id) {
    const apiConnectorImpl = new ApiConnectorImpl();
    return apiConnectorImpl.generateQuestion(createContextV3(), inputs);
  } else if (featureId === SingleSignOnOptionItem.id) {
  }
  return ok(undefined);
}

export async function getNotificationTriggerQuestionNode(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const res = new QTreeNode({
    type: "group",
  });
  if (isCLIDotNetEnabled()) {
    Object.values(Runtime).forEach((runtime) => {
      const node = new QTreeNode(createHostTypeTriggerQuestion(inputs.platform, runtime));
      node.condition = getConditionOfNotificationTriggerQuestion(runtime);
      res.addChild(node);
    });
  } else {
    const runtime = getPlatformRuntime(inputs.platform);
    const node = new QTreeNode(createHostTypeTriggerQuestion(inputs.platform, runtime));
    res.addChild(node);
  }
  res.condition = showNotificationTriggerCondition;
  return ok(res);
}

export function getPluginCLIName(name: string): string {
  const pluginPrefix = "fx-resource-";
  if (name === ResourcePlugins.Aad) {
    return "aad-manifest";
  } else if (name === ResourcePlugins.AppStudio) {
    return "manifest";
  } else {
    return name.replace(pluginPrefix, "");
  }
}

const PlatformRuntimeMap: Map<Platform, Runtime> = new Map<Platform, Runtime>([
  [Platform.VS, Runtime.dotnet],
  [Platform.VSCode, Runtime.nodejs],
  [Platform.CLI, Runtime.nodejs],
  [Platform.CLI_HELP, Runtime.nodejs],
]);

function getKeyNotFoundInMapErrorMsg(key: any) {
  return `The key ${key} is not found in map.`;
}

export function getPlatformRuntime(platform: Platform): Runtime {
  const runtime = PlatformRuntimeMap.get(platform);
  if (runtime) {
    return runtime;
  }
  throw new Error(getKeyNotFoundInMapErrorMsg(platform));
}

export function createAddAzureResourceQuestion(
  alreadyHaveFunction: boolean,
  alreadyHaveSQL: boolean,
  alreadyHaveAPIM: boolean,
  alreadyHaveKeyVault: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [AzureResourceFunction, AzureResourceSQL];
  if (!alreadyHaveAPIM) options.push(AzureResourceApim);
  if (!alreadyHaveKeyVault) options.push(AzureResourceKeyVault);
  return {
    name: AzureSolutionQuestionNames.AddResources,
    title: "Cloud resources",
    type: "multiSelect",
    staticOptions: options,
    default: [],
    onDidChangeSelection: async function (
      currentSelectedIds: Set<string>,
      previousSelectedIds: Set<string>
    ): Promise<Set<string>> {
      const hasSQL = currentSelectedIds.has(AzureResourceSQL.id);
      const hasAPIM = currentSelectedIds.has(AzureResourceApim.id);
      if ((hasSQL || hasAPIM) && !alreadyHaveFunction) {
        currentSelectedIds.add(AzureResourceFunction.id);
      }
      return currentSelectedIds;
    },
  };
}

export function createAddCloudResourceOptions(
  alreadyHaveAPIM: boolean,
  alreadyHaveKeyVault: boolean
): OptionItem[] {
  const options: OptionItem[] = [AzureResourceFunctionNewUI];
  if (!alreadyHaveAPIM) options.push(AzureResourceApimNewUI);
  options.push(AzureResourceSQLNewUI);
  if (!alreadyHaveKeyVault) options.push(AzureResourceKeyVaultNewUI);
  return options;
}

export function addCapabilityQuestion(
  alreadyHaveTab: boolean,
  alreadyHaveBot: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [];
  if (!alreadyHaveTab) options.push(TabOptionItem());
  if (!alreadyHaveBot) {
    options.push(BotOptionItem());
    options.push(MessageExtensionItem());
    options.push(NotificationOptionItem());
    options.push(CommandAndResponseOptionItem());
  }
  return {
    name: AzureSolutionQuestionNames.Capabilities,
    title: isBotNotificationEnabled()
      ? getLocalizedString("core.addCapabilityQuestion.titleNew")
      : getLocalizedString("core.addCapabilityQuestion.title"),
    type: "multiSelect",
    staticOptions: options,
    default: [],
  };
}

export const DeployPluginSelectQuestion: MultiSelectQuestion = {
  name: AzureSolutionQuestionNames.PluginSelectionDeploy,
  title: `Select resources`,
  type: "multiSelect",
  skipSingleOption: true,
  staticOptions: [],
  default: [],
};

export const AskSubscriptionQuestion: FuncQuestion = {
  name: AzureSolutionQuestionNames.AskSub,
  type: "func",
  func: async (inputs: Inputs): Promise<Void> => {
    return ok(Void);
  },
};

export function getUserEmailQuestion(currentUserEmail: string): TextInputQuestion {
  let defaultUserEmail = "";
  if (currentUserEmail && currentUserEmail.indexOf("@") > 0) {
    defaultUserEmail = "[UserName]@" + currentUserEmail.split("@")[1];
  }
  return {
    name: "email",
    type: "text",
    title: getLocalizedString("core.getUserEmailQuestion.title"),
    default: defaultUserEmail,
    validation: {
      validFunc: (input: string, previousInputs?: Inputs): string | undefined => {
        if (!input || input.trim() === "") {
          return getLocalizedString("core.getUserEmailQuestion.validation1");
        }

        input = input.trim();

        if (input === defaultUserEmail) {
          return getLocalizedString("core.getUserEmailQuestion.validation2");
        }

        const re = /\S+@\S+\.\S+/;
        if (!re.test(input)) {
          return getLocalizedString("core.getUserEmailQuestion.validation3");
        }
        return undefined;
      },
    },
  };
}

export function SelectEnvQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: "env",
    title: getLocalizedString("core.QuestionSelectTargetEnvironment.title"),
    staticOptions: [],
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

export function InitEditorVSCode(): OptionItem {
  return {
    id: "vsc",
    label: getLocalizedString("core.InitEditorVsc"),
    description: getLocalizedString("core.InitEditorVscDesc"),
  };
}

export function InitEditorVS(): OptionItem {
  return {
    id: "vs",
    label: getLocalizedString("core.InitEditorVs"),
    description: getLocalizedString("core.InitEditorVsDesc"),
  };
}

export function InitCapabilityTab(): OptionItem {
  return {
    id: "tab",
    label: "Tab",
    description: getLocalizedString("core.InitCapabilityTab"),
  };
}
export function InitCapabilityBot(): OptionItem {
  return {
    id: "bot",
    label: "Bot",
    description: getLocalizedString("core.InitCapabilityBot"),
  };
}

export function InitOptionYes(): OptionItem {
  return {
    id: "true",
    label: getLocalizedString("core.InitOptionYes"),
  };
}
export function InitOptionNo(): OptionItem {
  return {
    id: "false",
    label: getLocalizedString("core.InitOptionNo"),
  };
}
export function InitEditorQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: "editor",
    title: getLocalizedString("core.InitEditorTitle"),
    staticOptions: [InitEditorVSCode(), InitEditorVS()],
  };
}
export function InitCapabilityQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: "capability",
    title: getLocalizedString("core.InitCapabilityTitle"),
    staticOptions: [InitCapabilityTab(), InitCapabilityBot()],
  };
}
export function InitIsSPFxQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: "spfx",
    title: getLocalizedString("core.InitIsSPFxTitle"),
    staticOptions: [InitOptionNo(), InitOptionYes()],
  };
}
export function InitDebugProceedQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: "proceed",
    title: async (inputs: Inputs) => {
      let fileList;
      if (inputs["editor"] === InitEditorVSCode().id) {
        const exists = inputs.projectPath
          ? await fs.pathExists(path.join(inputs.projectPath, ".vscode"))
          : false;
        const dotVscodeFolderName = exists ? ".vscode-teamsfx" : ".vscode";
        fileList = `  ${dotVscodeFolderName}/\n    - launch.json\n    - settings.json\n    - tasks.json\n  env/\n    - .env.local\n  - teamsapp.local.yml\n  - teamsapp.yml\n`;
      } else {
        fileList = "  env/\n    - .env.local\n  - teamsapp.yml/\n  - teamsapp.local.yml\n";
      }
      return getLocalizedString("core.InitGenerateConfirm", fileList);
    },
    staticOptions: [InitOptionYes(), InitOptionNo()],
    default: InitOptionYes().id,
  };
}
export function InitInfraProceedQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: "proceed",
    title: (inputs: Inputs) => {
      const fileList =
        inputs["spfx"] === InitOptionYes().id
          ? "  env/\n    - .env.dev\n  - teamsapp.yml\n"
          : `  infra/\n${
              inputs["capability"] === InitCapabilityBot().id
                ? "    botRegistration/\n      - azurebot.bicep\n      - readme.md\n"
                : ""
            }    - azure.bicep\n    - azure.parameters.json\n  env/\n    - .env.dev\n  - teamsapp.yml\n`;
      return getLocalizedString("core.InitGenerateConfirm", fileList);
    },
    staticOptions: [InitOptionYes(), InitOptionNo()],
    default: InitOptionYes().id,
  };
}
export function getQuestionsForInit(
  type: "debug" | "infra",
  inputs: Inputs
): Result<QTreeNode | undefined, FxError> {
  const group = new QTreeNode({ type: "group" });
  group.addChild(new QTreeNode(InitEditorQuestion()));
  const capabilityNode = new QTreeNode(InitCapabilityQuestion());
  group.addChild(capabilityNode);
  const SPFxNode = new QTreeNode(InitIsSPFxQuestion());
  SPFxNode.condition = {
    validFunc: (input: string, inputs?: Inputs) => {
      if (inputs?.editor === InitEditorVSCode().id && inputs?.capability === InitCapabilityTab().id)
        return undefined;
      return "Not supported";
    },
  };
  capabilityNode.addChild(SPFxNode);
  if (inputs.platform !== Platform.CLI_HELP) {
    group.addChild(
      new QTreeNode(type === "debug" ? InitDebugProceedQuestion() : InitInfraProceedQuestion())
    );
  }
  return ok(group);
}

export function spfxFolderQuestion(): FolderQuestion {
  return {
    type: "folder",
    name: SPFxQuestionNames.SPFxFolder,
    title: getLocalizedString("core.spfxFolder.title"),
    placeholder: getLocalizedString("core.spfxFolder.placeholder"),
    default: (inputs: Inputs) => {
      return path.join(inputs.projectPath!, "src");
    },
  };
}

export function getQuestionsForAddWebpart(inputs: Inputs): Result<QTreeNode | undefined, FxError> {
  const addWebpart = new QTreeNode({ type: "group" });
  const loadPackage = new QTreeNode(loadPackageVersions);
  const spfxPackage = new QTreeNode(spfxPackageSelectQuestion);

  if (inputs.platform === Platform.CLI_HELP) {
    addWebpart.addChild(spfxPackage);
  } else {
    addWebpart.addChild(loadPackage);
    loadPackage.addChild(spfxPackage);
  }

  const spfxFolder = new QTreeNode(spfxFolderQuestion());
  spfxPackage.addChild(spfxFolder);

  const webpartName = new QTreeNode(webpartNameQuestion);
  spfxFolder.addChild(webpartName);

  const manifestFile = selectTeamsAppManifestQuestion(inputs);
  webpartName.addChild(manifestFile);

  const localManifestFile = selectTeamsAppManifestQuestion(inputs, true);
  manifestFile.addChild(localManifestFile);

  return ok(addWebpart);
}

export async function getQuestionsForValidateManifest(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForValidateAppPackage(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // App package path node
  const teamsAppSelectNode = new QTreeNode(selectTeamsAppPackageQuestion());
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForCreateAppPackage(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForUpdateTeamsApp(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}
